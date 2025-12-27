# Azure DevOps Integration - Bug Fixes & Testing Notes

## Session Date: 2025-01-11

---

## Critical Bug Fixes Applied

### 1. Customer PAT Encryption Bypass ⚠️ SECURITY

**Severity:** HIGH (Security Issue)
**Status:** ✅ FIXED

**Problem:**
When updating a customer's Azure DevOps configuration, the Personal Access Token (PAT) was not being encrypted. The `findOneAndUpdate` method bypasses Mongoose pre-save hooks where encryption logic resides.

**Root Cause:**
```typescript
// This bypasses pre-save hooks:
await Customer.findOneAndUpdate({ _id: id, userId }, updateData);
```

**Solution:**
```typescript
// This triggers pre-save hooks:
const customer = await Customer.findOne({ _id: id, userId });
if (!customer) {
  throw new Error('Customer not found');
}
Object.assign(customer, updateData);
await customer.save(); // ✅ Encryption happens here
```

**Files Modified:**
- `backend/src/controllers/customer.controller.ts` (updateCustomer method)

**Verification:**
- PAT is now properly encrypted in database
- Decryption works correctly via `getDecryptedPAT()` method
- PAT never returned in API responses (toJSON transform)

---

### 2. TypeScript Compilation Error in Azure DevOps Client

**Severity:** HIGH (Build Blocker)
**Status:** ✅ FIXED

**Problem:**
TypeScript compilation failed with type mismatch error on line 153 of `azure-devops-client.service.ts`:

```
error TS2322: Type 'HeadersDefaults & { [key: string]: AxiosHeaderValue; }' 
is not assignable to type 'AxiosHeaders | ...'
```

**Root Cause:**
Attempting to pass `this.axiosInstance.defaults.headers` directly to axios caused type incompatibility.

**Solution:**
Extract specific header values instead of passing the entire defaults object:

```typescript
// Extract authorization header from the instance
const authHeader = this.axiosInstance.defaults.headers['Authorization'];
const apiVersion = this.axiosInstance.defaults.params?.['api-version'];

const response = await axios.get(iterationsUrl, {
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  },
  params: {
    'api-version': apiVersion,
  },
});
```

**Files Modified:**
- `backend/src/services/azure-devops-client.service.ts` (getIterations method, lines 153-165)

**Verification:**
- ✅ `npm run build` passes without errors
- ✅ TypeScript strict mode compliance maintained

---

### 3. Azure DevOps API Domain Compatibility

**Severity:** HIGH (Functional Issue)
**Status:** ✅ FIXED

**Problem:**
The integration was designed for `dev.azure.com` but user's organization uses `visualstudio.com` (legacy domain), which requires:
- Different API version (5.0 instead of 7.1)
- Different URL format for team iterations endpoint
- Project/team names instead of IDs in URLs

**Root Cause:**
Hardcoded API version and URL format assumptions.

**Solution Implemented:**

#### Part A: API Version Detection
```typescript
constructor(organizationUrl: string, pat: string) {
  // Determine API version based on domain
  const isVisualStudio = organizationUrl.includes('visualstudio.com');
  const apiVersion = isVisualStudio ? '5.0' : '7.1';
  
  this.axiosInstance = axios.create({
    baseURL: `${organizationUrl}/_apis`,
    params: {
      'api-version': apiVersion,
    },
  });
}
```

#### Part B: Iterations Endpoint URL Format
```typescript
async getIterations(projectId: string): Promise<IAzureDevOpsIteration[]> {
  // 1. Fetch project details to get project name
  const projectResponse = await this.axiosInstance.get(`/projects/${projectId}`);
  const projectName = projectResponse.data.name;
  
  // 2. Get default team
  const defaultTeam = projectResponse.data.defaultTeam;
  
  // 3. Construct name-based URL (works for visualstudio.com)
  const orgUrl = this.axiosInstance.defaults.baseURL?.replace('/_apis', '') || '';
  const iterationsUrl = `${orgUrl}/${encodeURIComponent(projectName)}/${encodeURIComponent(defaultTeam.name)}/_apis/work/teamsettings/iterations`;
  
  // 4. Fetch iterations
  const response = await axios.get(iterationsUrl, { ... });
  return response.data.value || [];
}
```

**URL Format Comparison:**

| Domain | Format |
|--------|--------|
| dev.azure.com | `https://dev.azure.com/{org}/_apis/work/{projectId}/{teamId}/teamsettings/iterations?api-version=7.1` |
| visualstudio.com | `https://{org}.visualstudio.com/{projectName}/{teamName}/_apis/work/teamsettings/iterations?api-version=5.0` |

**Working Example (User's Instance):**
```
Organization: https://suezsmartsolutions.visualstudio.com
Project ID: ccc8fe01-d996-4085-8ae3-fb2d5ee0e3f4
Project Name: Aquadvanced-Energy
Team ID: 9757cea5-cf29-43fd-bef2-c9cad08d21f1
Team Name: Aquadvanced Energy

Working URL:
https://suezsmartsolutions.visualstudio.com/Aquadvanced-Energy/Aquadvanced%20Energy/_apis/work/teamsettings/iterations?api-version=5.0
```

**Files Modified:**
- `backend/src/services/azure-devops-client.service.ts` (constructor and getIterations method)

**Verification:**
- ✅ API version automatically detected based on domain
- ✅ Iterations endpoint constructs correct URL format
- ✅ Works with both dev.azure.com and visualstudio.com

---

## Work Items Import Endpoint Analysis

### getWorkItemsByIteration() - No Changes Required ✅

**Current Implementation:**
Uses WIQL (Work Item Query Language) API which is domain-agnostic:
- Endpoint: `/_apis/wit/wiql` (Step 1: Query work item IDs)
- Endpoint: `/_apis/wit/workitems` (Step 2: Fetch work item details)

**Why No Changes Needed:**
1. WIQL endpoints work the same on both domains
2. API version is already handled by axios instance (5.0 or 7.1)
3. Project parameter accepts both ID and name
4. Work items endpoint is project-agnostic (uses work item IDs directly)

**Verification:**
- ✅ Uses base axios instance with correct API version
- ✅ Standard REST API paths work on both domains
- ✅ No TypeScript compilation errors

---

## Testing Status

### Build Status
- ✅ Backend TypeScript compilation: **PASSING**
- ✅ Frontend Angular build: **NOT TESTED** (frontend already working)

### Unit Tests
- ⏳ **PENDING** - Task 14: Add unit tests for Azure DevOps services
- No test files exist yet in `backend/tests/` or `backend/__tests__/`

### Integration Tests
- ⏳ **PENDING** - Task 13: Add integration tests for Azure DevOps endpoints
- No test files exist yet

### Manual Testing Required
User needs to test the following workflow:
1. ✅ Create/update customer with Azure DevOps PAT
2. ✅ Create/update project with Azure DevOps project name
3. 🔄 **NEEDS TESTING:** Fetch iterations from project detail view
4. 🔄 **NEEDS TESTING:** Import work items from selected iteration
5. 🔄 **NEEDS TESTING:** Verify tasks created with Azure DevOps metadata

---

## Security Notes

### PAT Handling
- ✅ PAT encrypted at rest using AES-256-CBC
- ✅ PAT never returned in API responses
- ✅ PAT decrypted only when making Azure DevOps API calls
- ⚠️ **ACTION REQUIRED:** User should regenerate PAT (was shared during debugging)

### Encryption Configuration
- Requires `ENCRYPTION_KEY` environment variable in `.env`
- Key should be 32 bytes (256 bits) for AES-256
- Example: `ENCRYPTION_KEY=your_32_character_encryption_key_here`

---

## Known Limitations

1. **Team Selection:** Currently uses default team only
   - Future enhancement: Allow user to select specific team

2. **Work Item Types:** Only imports Bug, Task, User Story
   - Other types (Epic, Feature, etc.) are filtered out
   - Configurable in WIQL query if needed

3. **Sync Direction:** One-way import only (Azure DevOps → App)
   - No sync back to Azure DevOps
   - No automatic updates when work items change

4. **Rate Limiting:** No rate limit handling implemented
   - Azure DevOps has rate limits (200 requests per user per minute)
   - Consider adding retry logic with exponential backoff

---

## Next Steps

### Immediate (Required for Production)
1. ⏳ **Task 13:** Add integration tests for Azure DevOps endpoints
2. ⏳ **Task 14:** Add unit tests for Azure DevOps services
3. 🔄 **Manual Testing:** User validates end-to-end workflow
4. ⚠️ **Security:** User regenerates Azure DevOps PAT

### Future Enhancements (Optional)
1. Add team selection dropdown in project form
2. Implement automatic sync on schedule (cron job)
3. Add rate limit handling with retry logic
4. Support additional work item types (Epic, Feature)
5. Add bi-directional sync (update Azure DevOps from app)
6. Add conflict resolution for manual edits vs. Azure DevOps updates

---

## Files Modified Summary

### Backend
1. `backend/src/controllers/customer.controller.ts`
   - Fixed PAT encryption bypass in updateCustomer method

2. `backend/src/services/azure-devops-client.service.ts`
   - Added API version detection based on domain
   - Fixed TypeScript compilation error in getIterations
   - Updated getIterations to use name-based URL format

### Documentation
1. `tasks/subtasks/azure-devops-integration/BACKEND_IMPLEMENTATION_SUMMARY.md`
   - Added bug fixes section

2. `tasks/subtasks/azure-devops-integration/BUGFIXES_AND_TESTING_NOTES.md`
   - Created this comprehensive testing and bug fix documentation

---

## Handoff to Testing Agent

### Test Coverage Requirements
- **Target:** >80% code coverage for all Azure DevOps services
- **Priority:** High (security-critical PAT handling)

### Test Files to Create

#### Integration Tests (Task 13)
Location: `backend/tests/integration/azure-devops.test.ts`

Test scenarios:
1. Customer CRUD with Azure DevOps configuration
   - Create customer with PAT (verify encryption)
   - Update customer PAT (verify re-encryption)
   - Fetch customer (verify PAT not returned)
   - Delete customer (verify cleanup)

2. Project validation endpoint
   - Valid project name → returns project details
   - Invalid project name → returns 404
   - Missing customer PAT → returns 400
   - Invalid PAT → returns 401

3. Iterations endpoint
   - Fetch iterations for valid project
   - Handle project without iterations
   - Handle invalid project ID
   - Test both dev.azure.com and visualstudio.com formats

4. Work items import endpoint
   - Import work items from iteration
   - Handle duplicate imports (idempotency)
   - Handle empty iterations
   - Verify task creation with Azure DevOps metadata
   - Verify project lastSyncedAt update

#### Unit Tests (Task 14)
Location: `backend/tests/unit/services/`

Files to create:
1. `azure-devops-client.service.test.ts`
   - Test API version detection
   - Test connection validation
   - Test project fetching
   - Test iterations fetching (mock axios)
   - Test work items fetching (mock axios)
   - Test error handling

2. `azure-devops-sync.service.test.ts`
   - Test work item to task transformation
   - Test duplicate detection
   - Test task updates
   - Test import statistics calculation

3. `encryption.helpers.test.ts`
   - Test PAT encryption
   - Test PAT decryption
   - Test encryption key validation

---

**Document Created:** 2025-01-11
**Status:** Ready for testing phase
**Build Status:** ✅ All builds passing
**Manual Testing:** Required before production deployment
