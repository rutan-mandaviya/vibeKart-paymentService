const express=require('express')
const router=express.Router()
const authMiddleware=require('../Middleware/auth.middleware')
const paymetController=require('../Controllers/payment.controller')

router.post('/create/:orderId',authMiddleware.CreateauthMiddleware([  'user' ]),paymetController.createPayment)

router.post("/verify", authMiddleware.CreateauthMiddleware([ "user" ]), paymetController.verifyPayment)
module.exports=router