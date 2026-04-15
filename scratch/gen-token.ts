import { generateVerificationToken } from './src/lib/jwt';
import dotenv from 'dotenv';
dotenv.config();

const userId = "0e38c98c-b3b3-40d5-9ebb-746573e9f106";
const email = "tester@example.com";

const token = generateVerificationToken(userId, email);
console.log(token);
