# Design Specification: Google Authentication (Institutional)

## Overview
This document outlines the architecture for integrating Google Sign-In on the mobile app, enforcing the `@ucsal.edu.br` domain, and establishing a secure session on the Fastify backend using offline access (Auth Code flow).

## 1. Database (Drizzle ORM)
- **`users` table modifications:**
  - `googleId`: `varchar(255)` (unique, not null)
  - `googleRefreshToken`: `text` (nullable, used for future Drive/Classroom integrations)
- **New `sessions` table:**
  - `id`: `varchar(255)` (primary key, generated via secure random bytes)
  - `userId`: `uuid` (foreign key referencing `users(id)`)
  - `expiresAt`: `timestamp` (with timezone)
  - `createdAt`: `timestamp` (with timezone)

## 2. Backend API (Fastify + tRPC)
- **Google Auth Client:** Use `google-auth-library` to exchange the `serverAuthCode` for tokens.
- **`auth` tRPC Router:**
  - `loginWithGoogle`: Mutation that receives `{ serverAuthCode: string }`.
  - Exchanges code for `access_token`, `refresh_token`, and `id_token`.
  - Verifies the user's email domain from the Google Profile. If it is not `@ucsal.edu.br`, throws an unauthorized TRPCError.
  - Upserts the user in the `users` table.
  - Creates a new record in `sessions` valid for 30 days.
  - Returns `{ sessionId: string, user: User }`.
- **tRPC Context & Protected Procedures:**
  - Update `createContext` to extract the `Authorization: Bearer <sessionId>` header.
  - Query the database to validate the session.
  - Create a `protectedProcedure` that throws `UNAUTHORIZED` se a sessão for inválida ou expirada.

## 3. Frontend (Expo / React Native)
- **Library:** `@react-native-google-signin/google-signin` configured with `offlineAccess: true`, `serverClientId` and `iosClientId`.
- **`login.viewmodel.ts`:**
  - Calls `GoogleSignin.signIn()`.
  - Retrieves the `serverAuthCode`.
  - Calls the tRPC `auth.loginWithGoogle` mutation.
  - On success, stores the `sessionId` in `expo-secure-store`.
  - Updates the global Jotai authentication state, dismissing the Login screen.
- **Error Handling:** 
  - Friendly error messages when a non-institutional email is used or when the sign-in modal is cancelled.

## 4. Environment Variables
- `EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` (Backend only)
