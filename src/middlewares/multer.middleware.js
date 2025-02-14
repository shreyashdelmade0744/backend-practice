import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname) // file ke original naam se hi local server pe store hoga
    }
  }) 
  //this function will upload filename 
  
  const upload = multer({ storage: storage })