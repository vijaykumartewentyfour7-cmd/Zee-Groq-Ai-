# Security Specification - Zee Grok AI

## 1. Data Invariants
1. A user can only read, write, or delete their own profile (`/users/{userId}`).
2. A conversation belongs strictly to the user who created it (`userId == request.auth.uid`).
3. Messages can only be added to a conversation if the requester owns the parent conversation and sets `userId == request.auth.uid`.
4. Memories belong exclusively to the user (`userId == request.auth.uid`).
5. Creator artifacts (scripts, images, audio, video jobs) belong exclusively to the user (`userId == request.auth.uid`).
6. Uploaded files metadata belong exclusively to the user (`userId == request.auth.uid`).
7. Users cannot manipulate another user's documents or inject arbitrarily large strings beyond the specified schema limits.

## 2. Dirty Dozen Attack Payloads
1. **Unauthenticated Read:** Anonymous or unauthenticated access to `/users/other_user_id` -> Denied.
2. **PII Hijack:** User A attempts to update `email` or `uid` on User B's profile -> Denied.
3. **Ghost Conversation Access:** User A attempts to list conversations belonging to User B (`resource.data.userId == userB`) -> Denied.
4. **Conversation Creation Spoof:** User A attempts to create a conversation with `userId = userB` -> Denied.
5. **Orphan Message Injection:** User B attempts to write a message inside User A's conversation -> Denied.
6. **Message Author Spoofing:** User A creates a message in their own conversation but sets `userId = userB` -> Denied.
7. **Memory Cross-Read:** User B queries `/memories` without matching `userId` -> Denied.
8. **Memory Write Spoof:** User B posts a malicious memory into User A's context -> Denied.
9. **Artifact Hijack:** User B tries to view or delete generated creator scripts or videos belonging to User A -> Denied.
10. **File Poisoning:** User B writes a file metadata record with 10MB junk payload or invalid ID -> Denied.
11. **Denial of Wallet Document ID Injection:** Attacker creates an ID with > 128 characters or special regex-violating characters -> Denied by `isValidId()`.
12. **Immutable Field Modification:** User attempts to alter `createdAt` or `userId` during an update -> Denied.
