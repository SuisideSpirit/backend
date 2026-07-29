import multer from "multer";
 

const storage = multer.diskStorage({
    destination : function(req , file , cb){
        cb(null , "./public/temp")
    },
    filename :function(req , file , cb){
        const sanitizedName = file.originalname.replace(/\s+/g, '-');
        
        // Append a unique timestamp to prevent files from overwriting each other
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    }
})

export const upload = multer({
    storage ,  
})