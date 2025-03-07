import { Request } from 'express';
import { IUser } from "src/models/User";

export interface AuthenticatedRequest extends Request {
    user: IUser;
}