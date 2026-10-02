
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import tryCatch from "./tryCatch.js";
import { docClient } from "./config/dynamodb.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { AuthenticatedRequest } from "./middleware.js";

export const registerUser = tryCatch(async (req, res) => {
   const { name, email, password } = req.body;

   const command = new GetCommand({
      TableName: process.env.USERS_TABLE_NAME as string,
      Key: { email },
   });

   let response = await docClient.send(command);
   if (response.Item) {
      res.status(400).json({ message: "User already exists" });
      return;
   }

   const hashPassword = await bcrypt.hash(password, 10);

   const userId = uuidv4();

   await docClient.send(new PutCommand({
      TableName: process.env.USERS_TABLE_NAME as string,
      Item: { userId, name, email, password: hashPassword, role: "user" }
   }));
   const userResult = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE_NAME as string,
      Key: { email },
   }));

   const token = jwt.sign({ _id: userId }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
   });

   res.status(201).json({ message: "User registered successfully", user: userResult.Item, token });
}); 

export const loginUser = tryCatch(async (req, res) => {
   const { email, password } = req.body; 

   const user = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE_NAME as string,
      Key: { email },
   }));  

   if (!user.Item) {
      res.status(404).json({ message: "User does not exist" });
      return;
   }

   const isPasswordValid = await bcrypt.compare(password, user.Item.password);

   if (!isPasswordValid) {
      res.status(400).json({ message: "Invalid password" });
      return;
   }

   const token = jwt.sign({ _id: user.Item.userId }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
   });
   res.status(200).json({ message: "User logged in successfully", user: user.Item, token });
});

export const getUserProfile = tryCatch(async (req: AuthenticatedRequest, res) => {
      const user = req.user;
      res.json( user );
})

export const addToPlaylist = tryCatch(async (req: AuthenticatedRequest, res)=> {
   const email = req.user?.email;

   const userResult = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE_NAME as string,
      Key: { email },
   }));

   const user = userResult.Item;

   if (!user) {
      res.status(404).json({ message: "User does not exist" });
      return;
   }

   // const playlist = user.playlist || [];
   console.log(user.playlist);

   if (user.playlist && user.playlist.includes(req.params.id)){
      const index = user.playlist.indexOf(req.params.id);

      // user.playlist.splice(index,1);

      await docClient.send(new UpdateCommand({
         TableName: process.env.USERS_TABLE_NAME as string,
         Key: { email },
         UpdateExpression: `REMOVE playlist[${index}]`,
         ReturnValues: "ALL_NEW"
      }));

      res.json({
         message: "Removed from playlist",
      })
      return;
   } 

   await docClient.send(new UpdateCommand({
      TableName: process.env.USERS_TABLE_NAME as string,
      Key: { email },
      UpdateExpression: "SET playlist = list_append(if_not_exists(playlist, :empty), :newSong)",
      ExpressionAttributeValues: {
         ":newSong": [req.params.id], 
         ":empty": []
      },
      ReturnValues: "ALL_NEW"
   }));

   res.json({
      message: "Added to Playlist"
   })
   
})