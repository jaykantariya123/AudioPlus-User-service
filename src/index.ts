import dotenv from "dotenv";
import express from "express";
import userRoutes from "./route.js";
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1", userRoutes);

app.get("/", (req, res) => {
  res.send("Server is working!");
});

const port = process.env.PORT || 5000;

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
export default app;