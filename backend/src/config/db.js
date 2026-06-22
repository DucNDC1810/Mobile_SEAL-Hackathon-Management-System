import mongoose from "mongoose";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
      dbName: process.env.DB_DATABASE,
    });
    console.log("Liên kết CSDL thành công !!!!");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error(">>>>>>Error nè:", error);
  }
};
