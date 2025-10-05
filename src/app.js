const express=require('express')
const cookieParser=require('cookie-parser')
const paymentRoutes=require('./routes/payment.routes')
const { connect } = require('./broker/broker')


const app=express()
connect()
app.use(express.json())
app.use(cookieParser())

app.get('/',(req,res)=>{
    res.status(200).json({
        "message": "Payment Service is Running"
    });
} );
app.use('/api/payments',paymentRoutes)

// const crypto = require("crypto");

// function generateSignature(order_id, payment_id, key_secret){
//     const hmac = crypto.createHmac("sha256", key_secret);
//     hmac.update(order_id + "|" + payment_id);
//     return hmac.digest("hex");
// }

// const signature = generateSignature("order_RODltOcZUmk3PE", "pay_RODmDrfW9D7A80", process.env.RAZORPAY_KEY_SECRET);
// console.log(signature);


module.exports=app