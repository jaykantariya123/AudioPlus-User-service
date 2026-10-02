import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { docClient } from "./config/dynamodb.js";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

interface IUser {
    userId: string;
    email: string;
    name: string;
    password: string;
    role: string;
    playlist: string[];
}
export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.token as string;
        if (!token) {
            res.status(403).json({ message: "Please login" });
            return;
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

        if (!decoded || !decoded._id) {
            res.status(403).json({ message: "Invalid token" });
            return;
        }

        const userId = decoded._id;

        const user = await docClient.send(new QueryCommand({
            TableName: process.env.USERS_TABLE_NAME as string,
            IndexName: "userId-index",
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId
            },
            ProjectionExpression: "userId, email, #userName, #userRole, playlist",
            ExpressionAttributeNames: {
                "#userName": "name",
                "#userRole": "role"
            }
        }));
        
        if (!user.Items || user.Items.length === 0) {
            res.status(403).json({ message: "User not found" });
            return;
        }

        req.user = user.Items[0] as IUser;
        next();
    } catch (error : any) {
        res.status(403).json({ message: error.message || "Please login" });
    }
};
