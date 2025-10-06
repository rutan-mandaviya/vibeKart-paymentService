require('dotenv').config();
const axios = require('axios');
const Razorpay = require('razorpay');
const paymentModel = require('../models/payement.model');
const { publishToQueue } = require("../broker/broker");
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Payment
async function createPayment(req, res) {
    const orderId = req.params.orderId;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

    try {
        // const orderId = req.params.orderId;

        const orderResponse = await axios.get(`https://vibekart-orderservice.onrender.com/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // ✅ Log only data, not entire response
        console.log("Order Data:", orderResponse.data);

        // ✅ Access actual numeric price and currency
        const price = orderResponse.data.order.totalPrice.amount;
        const currency = orderResponse.data.order.totalPrice.currency || "INR";

        console.log("💰 Price:", price, "Currency:", currency);

        // Razorpay requires amount in paise (multiply by 100)
        const order = await razorpay.orders.create({
            amount: price * 100,
            currency,
            receipt: "order_" + orderId
        });

        // Save payment record in DB
        const payment = await paymentModel.create({
            order: orderId,
            razorpayOrderId: order.id,
            user: req.user.id,
            price: {
                amount: order.amount,
                currency: order.currency
            },
            status: 'PENDING'
        });

        // Publish events to queues
        await publishToQueue("seller_dashboard_Payment_order_initiated", payment);
        await publishToQueue("Payment_Notification_order_initiated", {
            email: req.user.email,
            orderId,
            paymentId: payment._id,
            amount: order.amount,
            currency: order.currency,
            username: req.user.username,
        });

        return res.status(201).json({ message: 'Payment initiated successfully', payment });

    } catch (err) {
        console.error("❌ Create payment error:", err.response?.data || err.message);
        return res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
}

// Verify Payment
async function verifyPayment(req, res) {
    const { razorpayOrderId, paymentId, signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    try {
        const isValid = validatePaymentVerification(
            { order_id: razorpayOrderId, payment_id: paymentId },
            signature,
            secret
        );

        if (!isValid) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const payment = await paymentModel.findOneAndUpdate(
            { razorpayOrderId, status: 'PENDING' },
            {
                paymentId,
                signature,
                status: 'COMPLETED'
            },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        await publishToQueue("Payment_order_created", {
            email: req.user.email,
            orderId: razorpayOrderId,
            paymentId: payment._id,
            username: req.user.username,
            amount: payment.price.amount,
            currency: payment.price.currency
        });
     
      await publishToQueue("order_service_payment_completed", {
    order: payment.order,
    status: "CONFIRMED"
});
      await publishToQueue("order_service_Confirmed", {
    order: payment.order,
    status: "CONFIRMED"
});



        await publishToQueue("seller_dashboard_Payment_order_completed", payment);

        res.status(200).json({ message: 'Payment verified successfully', payment });

    } catch (err) {
        console.error("❌ Verify payment error:", err);
        await publishToQueue("Payment_order_failed", {
            email: req.user?.email,
            paymentId,
            username: req.user?.username,
        });

        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = {
    createPayment,
    verifyPayment
};
