const jwt =require ('jsonwebtoken')



function CreateauthMiddleware(roles=["user"]){

    return function authMiddleware(req,res,next){
        const token=req.cookies?.token || req.headers?.authorization?.split(' ')[1];

        if(!token){
            return res.status(401).json({
                message:"unauthorize ! No token Provided"
            })
        }

        try {

            const decoded=jwt.verify(token,process.env.JWT_SECRET)
           
            
            if(!roles.includes(decoded.role)){
                 return res.status(403).json({
                message:"Forbidden ! Insufficient Permission"
            })
            }

            req.user=decoded
           
            next();
            
        } catch (error) {
             return res.status(401).json({
                message:"unauthorize ! No token Provided"
            })


            
        }
    }
}

module.exports={CreateauthMiddleware}