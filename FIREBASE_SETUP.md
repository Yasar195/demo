# Firebase Cloud Messaging (FCM) Setup Guide

## Overview
Firebase Cloud Messaging has been integrated into your Sustify backend to enable push notifications to iOS, Android, and Web clients.

## Prerequisites
1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Firebase Admin SDK service account credentials

## Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select existing project
3. Follow the setup wizard

### 2. Generate Service Account Key
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Download the JSON file (e.g., `firebase-service-account.json`)
5. Store it securely in your project (e.g., `config/firebase-service-account.json`)
6. **IMPORTANT**: Add this file to `.gitignore` to prevent committing secrets

### 3. Configure Environment Variables

Add the following to your `.env` file. You have **three options**:

#### Option 1: JSON String (Recommended for Production)
```env
# Firebase Configuration - Paste entire JSON as string
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

FIREBASE_PROJECT_ID=your-project-id
```

**Note:** When using JSON string, make sure to:
- Use single quotes around the entire JSON
- Keep newlines in private_key as `\n`
- Escape any quotes inside the JSON if needed

#### Option 2: File Path (Recommended for Local Development)
```env
# Firebase Configuration - Path to JSON file
FIREBASE_SERVICE_ACCOUNT=/absolute/path/to/firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id
```

#### Option 3: Default Application Credentials (Cloud Environments)
```env
# Firebase Configuration - Use environment's default credentials
FIREBASE_PROJECT_ID=your-project-id
# Leave FIREBASE_SERVICE_ACCOUNT empty
```

**Best Practices:**
- **Local Development**: Use file path (Option 2)
- **Production/Cloud**: Use JSON string in environment variable (Option 1)
- **Google Cloud Platform**: Use default credentials (Option 3)

### 4. Run Database Migration

Generate and run Prisma migration to add device tokens table:

```bash
npx prisma migrate dev --name add_device_tokens_and_fcm
```

### 5. Update `.gitignore`

Ensure Firebase credentials are not committed:

```gitignore
# Firebase credentials
config/firebase-service-account.json
firebase-service-account.json
**/firebase-credentials*.json
```

## API Endpoints

### Device Token Management

#### Register Device Token
```http
POST /notifications/device-token
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "token": "fcm-device-token-from-client",
  "platform": "ANDROID" | "IOS" | "WEB",
  "deviceId": "optional-device-identifier"
}
```

#### Unregister Device Token
```http
DELETE /notifications/device-token
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "token": "fcm-device-token-to-remove"
}
```

#### Get User's Device Tokens
```http
GET /notifications/device-tokens
Authorization: Bearer <jwt-token>
```

### Notification Endpoints (Existing, now with FCM)

#### Create Notification (sends in-app + push)
```http
POST /notifications
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "title": "New Voucher Available!",
  "message": "Check out our latest eco-friendly deals",
  "userIds": ["user-id-1", "user-id-2"]
}
```

## Client Integration

### Android (Kotlin)
```kotlin
// Get FCM token
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Register with your backend
        registerDeviceToken(token, "ANDROID")
    }
}
```

### iOS (Swift)
```swift
import Firebase

// Get FCM token
Messaging.messaging().token { token, error in
    if let token = token {
        // Register with your backend
        registerDeviceToken(token, "IOS")
    }
}
```

### Web (JavaScript)
```javascript
import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();
getToken(messaging, { vapidKey: 'your-vapid-key' })
  .then((token) => {
    // Register with your backend
    registerDeviceToken(token, "WEB");
  });
```

## Architecture

### Database Schema

```prisma
enum DevicePlatform {
  IOS
  ANDROID
  WEB
}

model DeviceToken {
  id        String         @id @default(uuid())
  userId    String
  token     String         @unique
  platform  DevicePlatform
  deviceId  String?
  isActive  Boolean        @default(true)
  lastUsed  DateTime       @default(now())
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Flow Diagram

```
User Action → Create Notification
    ↓
Store in Database (Notification + NotificationRecipient)
    ↓
Retrieve Device Tokens for Recipients
    ↓
Send via FCM (Firebase Service)
    ↓
Handle Invalid Tokens (Auto-deactivate)
```

## Features

### ✅ Implemented
- Device token registration/unregistration
- Automatic push notification sending when notifications are created
- Multi-device support per user
- Invalid token detection and cleanup
- Platform-specific configurations (iOS/Android/Web)
- Silent failure for FCM (won't break app if Firebase is down)

### 🔄 Automatic Features
- Duplicate token handling (updates existing instead of creating new)
- Invalid token cleanup after failed sends
- Last used timestamp updates

## Testing

### 1. Test Token Registration
```bash
curl -X POST http://localhost:3000/notifications/device-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-fcm-token-123",
    "platform": "ANDROID"
  }'
```

### 2. Test Push Notification
```bash
# Create a notification (as admin)
curl -X POST http://localhost:3000/notifications \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test push notification",
    "userIds": ["user-id-with-registered-token"]
  }'
```

### 3. Check Logs
Monitor your application logs for:
- `Firebase Admin SDK initialized successfully`
- `Push notification sent successfully`
- `Multicast notification sent: X successful, Y failed`

## Troubleshooting

### Firebase Initialization Errors

#### "Failed to parse Firebase service account JSON"
- **Cause**: Invalid JSON format in `FIREBASE_SERVICE_ACCOUNT` environment variable
- **Solution**:
  1. Ensure the JSON is properly formatted
  2. Use single quotes around the entire JSON string in `.env`
  3. Keep `\n` characters in the private_key field
  4. Validate JSON at [jsonlint.com](https://jsonlint.com)

**Example of correct format:**
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"sustify-prod","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBAD...\n-----END PRIVATE KEY-----\n"}'
```

#### "Failed to load Firebase service account file"
- **Cause**: File path is incorrect or file doesn't exist
- **Solution**:
  1. Use absolute path, not relative
  2. Check file exists: `ls /path/to/firebase-service-account.json`
  3. Ensure proper file permissions (readable by application)

#### "Firebase credentials not configured"
- **Cause**: Neither `FIREBASE_SERVICE_ACCOUNT` nor `FIREBASE_PROJECT_ID` is set
- **Solution**: Set at least one of the environment variables (see Configuration section)
- **Note**: This is a warning, not an error. App will continue without push notifications.

### FCM Not Sending
1. **Check Firebase credentials**: Verify `FIREBASE_SERVICE_ACCOUNT` is correct (JSON or path)
2. **Check project ID**: Ensure `FIREBASE_PROJECT_ID` matches your Firebase project
3. **Check device tokens**: Verify tokens are valid and registered
4. **Check logs**: Look for errors in application logs
   - `Loaded Firebase credentials from JSON string` ✅
   - `Loaded Firebase credentials from file path` ✅
   - `Firebase Admin SDK initialized successfully` ✅

### Invalid Token Errors
- Tokens are automatically deactivated when FCM reports them as invalid
- Common causes:
  - App uninstalled
  - Token expired
  - Wrong project credentials

### No Push Notifications Received
1. Check if device token is registered: `GET /notifications/device-tokens`
2. Verify notification was created: `GET /notifications`
3. Check FCM console for delivery stats
4. Ensure client app has notification permissions

## Security Best Practices

1. ✅ Never commit Firebase credentials to git
2. ✅ Use environment variables for configuration
3. ✅ Rotate service account keys periodically
4. ✅ Implement rate limiting on device token registration
5. ✅ Validate device tokens on registration
6. ✅ Use JWT authentication for all endpoints

## Performance Considerations

- Device tokens are cached per user
- Multicast messaging is used for sending to multiple devices
- Invalid tokens are automatically cleaned up
- Database indexes on `userId` and `token` for fast lookups

## Support

For Firebase-specific issues:
- [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
- [FCM Admin SDK Reference](https://firebase.google.com/docs/reference/admin/node)

For implementation issues:
- Check application logs
- Review [notifications.service.ts](src/modules/notifications/notifications.service.ts)
- Review [firebase.service.ts](src/integrations/firebase/firebase.service.ts)
