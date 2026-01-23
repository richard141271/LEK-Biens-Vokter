# LOCKED FEATURES PROTOCOL

⚠️ **CRITICAL INSTRUCTION FOR AI AGENTS** ⚠️

The following features and files are **LOCKED**.
**DO NOT MODIFY** these files or logic unless the User **EXPLICITLY** requests a change to that specific feature.
General "refactoring" or "cleanup" of these areas is **STRICTLY PROHIBITED**.

## 🔒 Locked Status

### 1. Landing Page
- **Status**: LOCKED (Restored to commit 9986bb7)
- **Files**: `src/app/page.tsx`
- **Reason**: User validated design. Do not change layout, text, or buttons.

### 2. PDF Reporting
- **Status**: LOCKED
- **Files**: 
    - `src/app/api/admin/report/pdf/route.tsx`
    - `src/utils/pdf-template.tsx`
    - `src/app/dashboard/admin/professional-report/page.tsx`
- **Reason**: A4 layout and Puppeteer config are tuned and verified.

### 3. KIAS Mail Module (Core)
- **Status**: LOCKED (Functional Baseline)
- **Files**:
    - `src/services/mail/*`
    - `src/app/actions/mail.ts`
- **Reason**: Architecture established. Only extend, do not rewrite.

### 4. General Core
- **Status**: LOCKED
- **Scope**: All existing database schema, authentication flows, and main dashboard layouts.

## 🛠 Procedure for Changes
1. **New Features**: Create NEW files. Do not modify existing ones if possible.
2. **Bug Fixes**: Only touch existing code if a specific bug is reported by the User.
3. **Refactoring**: DENIED for locked features.

---
*Last Updated: 2026-01-23*
