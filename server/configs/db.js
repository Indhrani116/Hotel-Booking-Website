import mongoose from 'mongoose'; // Fixed: changed 'ort' to 'import'

const connectDB = async () => {  
    try {
        mongoose.connection.on('connected',()=> console.log("Database Connected"));
        await mongoose.connect(`${process.env.MONGODB_URI}/hotel-booking`)
    } catch (error) {
        console.log(error.message);
    } // Fixed: changed 'st' to 'const'
}

export default connectDB;        // Fixed: changed 'ort' to 'export'
