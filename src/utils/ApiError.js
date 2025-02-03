class ApiError extends Error {
    constructor(
        statusCode,
        message = "something is wrong",
        errors =[],
        errorStack ="",
         

    ){

        super(message)
        this.statusCode = statusCode,
        this.data = null,
        this.message = message,
        this.success = false,
        this.errors = errors

        if(errorStack){
            this.errorStack = errorStack
        }
        else{
            Error.captureStackTrace(this,this.constructor)
        }

    }
}


export {ApiError}