import mongoose from "mongoose";

mongoose.connect(
"mongodb+srv://ozatirth51_db_user:MYuqcHvUDjagPX81@cluster0.djdetv4.mongodb.net/test"
)
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch(err => console.error("❌ Connection Failed:", err.message));