const User = require("../model/user-model")
const bcrypt = require("bcrypt")
const salt = 10;
exports.store = async (req, res) => {
    const { username, email, password } = req.body;

    try {
      
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ 
                success: false,
                message: "Email  is already registered"
            });
        }

        
       
        const hashedPassword = await bcrypt.hash(password, salt);

        
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        return res.status(201).json({ 
            success: true,
            message: "User created successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const finduser = await User.findOne({ username });

        if (!finduser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const matchPassword = await bcrypt.compare(password, finduser.password);

        if (!matchPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User login successfully",
            user: finduser
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
exports.getUserByID = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findOne({id});

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            user: user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find(); 

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No users found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            totalUsers: users.length,
            users: users
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params; 

    try {
        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
exports.deleteAllUsers = async (req, res) => {
    try {
        const result = await User.deleteMany({}); 

        return res.status(200).json({
            success: true,
            message: `All users deleted successfully. Total deleted: ${result.deletedCount}`
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


