import validator from "validator";
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import doctorModel from "../models/doctorModel.js";
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";

// Cloudinary configuration
cloudinary.config({
    cloud_name: 'your_cloud_name',
    api_key: 'your_api_key',
    api_secret: 'your_api_secret'
});

// API for adding doctor
const addDoctor = async (req, res) => {
    try {
        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body;
        const imageFile = req.file;

        // Checking for all data to add doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address || !imageFile) {
            return res.json({ success: false, message: "Missing Information" });
        }


        console.log('Information found' , imageFile);

        // Validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        console.log("Email valid");

        // Validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" });
        }

        // Hashing doctor password
        const salt = await bcrypt.genSalt(10); // Increase salt rounds for security
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log("Hashed Password:", hashedPassword);

        // Check if imageFile is provided
        if (!imageFile) {
            return res.json({ success: false, message: "Image file is required" });
        }

        // Upload image to Cloudinary 
        let imageUrl = ""
        try {
            // Upload image to Cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
        
            // Get the secure URL from the upload result
            imageUrl = imageUpload.secure_url;
        
            console.log(imageUrl); // Log the uploaded image URL for debugging
        } catch (error) {
            // Handle the error during upload
            console.error("Cloudinary Upload Error:", error);
            return res.json({ success: false, message: "Image upload failed. Please try again later." });
        }
        
        

        console.log("Image URL:", imageUrl);

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now()
        };

        console.log("Doctor Data:", doctorData);

        const newDoctor = new doctorModel(doctorData);
        await newDoctor.save();

        res.json({ success: true, message: "Doctor Added" });

    } catch (error) {
        console.log("Error:", error);
        res.json({ success: false, message: error.message });
    }
};


// API For admin Login

const loginAdmin = async (req , res) => {
    try {
        const {email , password} = req.body

        if (email===process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            
            const token = jwt.sign(email+password,process.env.JWT_SECRET)
            res.json({success:true , token})

        } else {
            res.json({success:false , message:"Invalid Credentials"})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false , message:error.message})
    }
}


// API to get all doctors list for admn panel

const allDoctors = async (req , res) => {

    try {
        const doctors = await doctorModel.find({}).select('-password');
        res.json({success:true , doctors})
    } catch (error) {
        console.log(error);
        res.json({success:false , message:error.message})
    }

}

// API to get all appointments list

const appointmentsAdmin = async(req , res) => {

    try {

        const appointments = await appointmentModel.find({})
        res.json({success:true , appointments})

    } catch (error) {
        console.log(error);
        res.json({success:false , message:error.message})
    }
}

const appointmentCancel = async (req , res) => {

    try {
        const {appointmentId} = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)


        await appointmentModel.findByIdAndUpdate(appointmentId , {cancelled:true})

        // releasing doctor slot

        const {docId , slotDate , slotTime} = appointmentData
        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e=>e!==slotTime)

        await doctorModel.findByIdAndUpdate(docId , {slots_booked})

        res.json({success:true, message:"Appointment cancelled"})

    } catch (error) {
        console.log(error);
        res.json({success:false , message:error.message})
    }

}

// API to get dashboard Data for admin panel

const adminDashboard = async (req , res) => {

    try {
        
        const doctors = await doctorModel.find({})
        const users = await userModel.find({})
        const appointments = await appointmentModel.find({})

        const dashData = {
            doctors: doctors.length,
            appointments: appointments.length,
            patients: users.length,
            latestAppointments: appointments.reverse().slice(0,5)
        }

        res.json({success:true , dashData})

    } catch (error) {
        console.log(error);
        res.json({success:false , message:error.message})
    }

}

export { addDoctor , loginAdmin , allDoctors , appointmentsAdmin , appointmentCancel , adminDashboard};
