import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connection } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.username || !credentials.password) {
                        return null;
                    }

                    const [rows]: any[] = await connection.execute(
                        'SELECT * FROM users WHERE username = ?',
                        [credentials.username]
                    );
                    
                    if (rows.length === 0) {
                        return null;
                    }

                    const user = rows[0];
                    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
                    
                    if (!isValidPassword) {
                        return null;
                    }

                    // ✅ ส่งข้อมูลที่จำเป็นเท่านั้น
                    return { 
                        id: user.id.toString(), 
                        name: user.username,
                        email: `${user.username}@local.app`,
                    };
                } catch (error) {
                    console.error('Authorization error:', error);
                    return null;
                }
            }
        })
    ],
    pages: {
        signIn: '/',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user }) {
            // ✅ เพิ่มข้อมูล user เข้า token ครั้งแรกที่ login
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            // ✅ ส่งข้อมูลจาก token ไปยัง session
            if (token && session.user) {
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.email = token.email;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};