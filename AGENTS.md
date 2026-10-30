# Alamano Operational & Deployment Guidelines

## 1. Intellectual Property & Brand Integrity
- **STRICT RULE**: Never reference, imply, or include third-party intellectual property, trademarks, or competitor brand names. Always use native branding: **Alamano**, **Alamano Courier**, **Alamano Express**, or generic descriptive terms.

## 2. Mandatory Production Deployment Workflow
Whenever you finish implementing any user request, feature, bug fix, or update, **ALWAYS** execute the following workflow automatically:

1. **Compile & Typecheck**:
   ```bash
   npm run typecheck
   ```
2. **Run Automated Test Suite**:
   ```bash
   npm test
   ```
3. **Build Web Production Export**:
   ```bash
   npx expo export --platform web
   ```
4. **Deploy to EAS Hosting (Production Web)**:
   ```bash
   npx eas deploy --prod --non-interactive
   ```
5. **Push OTA Update to EAS Channels (Android & iOS)**:
   ```powershell
   $env:EAS_NO_VCS="1"; npx eas update --channel production --environment production --message "<summary>" --non-interactive
   ```
6. **Report Deployment**:
   Output the live URL, commit status, and OTA update details to the user.
