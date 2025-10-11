# 01. Extend Customer Model with Azure DevOps Configuration

meta:
  id: azure-devops-integration-01
  feature: azure-devops-integration
  priority: P1
  depends_on: []
  tags: [backend, model, database, security]

## Objective
- Add Azure DevOps configuration fields to the Customer model to store organization URL and encrypted PAT (Personal Access Token)

## Deliverables
- Updated `backend/src/models/Customer.ts` with Azure DevOps configuration schema
- Encryption/decryption helper functions for PAT storage
- Database migration support for existing customers

## Steps
1. Add `azureDevOps` nested object to `ICustomer` interface with fields:
   - `organizationUrl: string` (e.g., "https://dev.azure.com/myorg")
   - `pat: string` (encrypted Personal Access Token)
   - `enabled: boolean` (flag to enable/disable integration)
2. Update `customerSchema` to include the new fields with appropriate validation:
   - `organizationUrl`: optional, URL format validation
   - `pat`: optional, encrypted string
   - `enabled`: default false
3. Create encryption helper in `backend/src/config/encryption.helpers.ts`:
   - `encryptPAT(pat: string): string` - Encrypt PAT using crypto module (AES-256-CBC)
   - `decryptPAT(encryptedPat: string): string` - Decrypt PAT for API calls
   - Use environment variable `ENCRYPTION_KEY` for encryption key
4. Add pre-save hook to Customer schema to automatically encrypt PAT if changed
5. Add method to Customer model: `getDecryptedPAT(): string` to safely retrieve decrypted PAT
6. Update Customer model indexes if needed for Azure DevOps queries
7. Add `.env.example` entry for `ENCRYPTION_KEY`

## Tests
- Unit:
  - Test encryption/decryption helpers (Arrange: plain PAT → Act: encrypt then decrypt → Assert: matches original)
  - Test Customer model saves with encrypted PAT (Arrange: customer with PAT → Act: save → Assert: stored value is encrypted)
  - Test `getDecryptedPAT()` method returns original PAT (Arrange: saved customer → Act: call method → Assert: returns decrypted PAT)
  - Test validation rejects invalid organization URLs
  - Test default values for `enabled` field (false)
- Integration:
  - Test creating customer with Azure DevOps config via API
  - Test updating customer Azure DevOps config
  - Test PAT is never returned in API responses (write-only field)

## Acceptance Criteria
- [ ] Customer model includes `azureDevOps` configuration object
- [ ] PAT is encrypted before storage using AES-256-CBC
- [ ] PAT can be decrypted for Azure DevOps API calls
- [ ] Organization URL validates as proper URL format
- [ ] `enabled` flag defaults to false
- [ ] Pre-save hook automatically encrypts PAT when changed
- [ ] Encryption key is configurable via environment variable
- [ ] Existing customers can be updated with Azure DevOps config
- [ ] All unit tests pass with >80% coverage
- [ ] Backend builds successfully: `cd backend && npm run build`

## Validation
- Run: `cd backend && npm run build` - should complete without errors
- Run: `cd backend && npm test -- customer.model` - all tests should pass
- Verify `.env.example` includes `ENCRYPTION_KEY` entry
- Manually test encryption: create customer with PAT, verify database stores encrypted value
- Manually test decryption: retrieve customer, call `getDecryptedPAT()`, verify returns original PAT

## Notes
- Use Node.js built-in `crypto` module for encryption (no external dependencies)
- PAT should never be logged or returned in API responses
- Consider adding PAT validation endpoint in future tasks
- Azure DevOps PAT format: base64-encoded string, typically 52 characters
- Organization URL format: `https://dev.azure.com/{organization}` or `https://{organization}.visualstudio.com`
- Reference: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate
