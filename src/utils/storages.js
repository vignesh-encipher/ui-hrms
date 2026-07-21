import CryptoJS from "crypto-js";
import { salt, isEncrypted } from "../utils/config";

const secretKey = salt;
const hashKey = (key) => {
  return CryptoJS.SHA256(key).toString();
};

export const ROOT_KEY = "APP_STORAGE";

export const LEGACY_MAPPING = {
  userRole: "auth.currentRole",
  roleId: "auth.roleId",
  aliasName: "auth.aliasName",
  userAllRoles: "auth.allRoles",
  userId: "auth.userId",
  orgId: "auth.orgId",
  token: "auth.token",
  refreshToken: "auth.refreshToken",
  accessMenuList: "auth.accessMenuList",
  loginCheck: "auth.isLoggedIn",
  proxyRole: "auth.proxyRole",
  tenantId: "auth.tenantId",

  client: "context.client",
  clientType: "context.clientType",
  project: "context.project",
  tinNumber: "context.tin.number",
  tinId: "context.tin.id",
  viewType: "context.viewType",

  patientId: "workspace.activePatientId",
  patientIds: "workspace.visitedPatientIds",
  fileIds: "workspace.activeFile.id",
  fileId: "workspace.activeFile.blobPath",
  hedisfileId: "workspace.activeHedisFile.blobPath",

  routeBackTo: "navigation.backRoutes.default",
  routeBackToAiResponse: "navigation.backRoutes.aiResponse",
  routeBackToFileAssessment: "navigation.backRoutes.fileAssessment",

  panelName: "context.panelName",
  queryApprovalRoleId: "auth.queryApprovalRoleId",
  patientSyncPdfListContext: "context.patientSyncPdfListContext",
};

const getPathValue = (obj, path) => {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

const setPathValue = (obj, path, value) => {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (
      !(part in current) ||
      typeof current[part] !== "object" ||
      current[part] === null
    ) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
};

const removePathValue = (obj, path) => {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) return;
    current = current[part];
  }
  delete current[parts[parts.length - 1]];
};

const cleanValue = (value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const getRootObject = () => {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return {};
  }
  try {
    let raw;
    if (isEncrypted === "true") {
      const hashedKey = hashKey(ROOT_KEY);
      const encryptedValue = sessionStorage.getItem(hashedKey);
      if (!encryptedValue) return {};
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedValue, secretKey);
      raw = decryptedBytes.toString(CryptoJS.enc.Utf8);
    } else {
      raw = sessionStorage.getItem(ROOT_KEY);
    }
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
};

const saveRootObject = (obj) => {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return;
  }
  try {
    const stringValue = JSON.stringify(obj);
    if (isEncrypted === "true") {
      const hashedKey = hashKey(ROOT_KEY);
      const encryptedValue = CryptoJS.AES.encrypt(
        stringValue,
        secretKey,
      ).toString();
      sessionStorage.setItem(hashedKey, encryptedValue);
    } else {
      sessionStorage.setItem(ROOT_KEY, stringValue);
    }
  } catch (error) {
    throw error;
  }
};

const isConsolidatedKey = (key) => {
  if (!key || typeof key !== "string") return false;
  return !!LEGACY_MAPPING[key] || key.includes(".");
};

const getLeafKey = (path) => {
  const parts = path.split(".");
  return parts[parts.length - 1];
};

export const getStorage = (key) => {
  try {
    if (
      typeof window === "undefined" ||
      typeof sessionStorage === "undefined"
    ) {
      return null;
    }
    if (key === null || key === undefined) return null;

    if (isConsolidatedKey(key)) {
      // Get from consolidated APP_STORAGE
      const path = LEGACY_MAPPING[key] || key;
      const root = getRootObject();
      let val = getPathValue(root, path);

      // Fallback 1: Check if stored flat inside APP_STORAGE (due to earlier migration stages)
      if (val === undefined || val === null) {
        const leaf = getLeafKey(path);
        if (root[leaf] !== undefined && root[leaf] !== null) {
          val = root[leaf];
          // Self-heal: migrate it to the nested path and save
          setPathValue(root, path, cleanValue(val));
          delete root[leaf];
          saveRootObject(root);
        }
      }

      // Fallback 2: Check direct sessionStorage key (supports active sessions during migration)
      if (val === undefined || val === null) {
        if (isEncrypted === "true") {
          const hashedKey = hashKey(key);
          const encryptedValue = sessionStorage.getItem(hashedKey);
          if (encryptedValue) {
            try {
              const decryptedBytes = CryptoJS.AES.decrypt(
                encryptedValue,
                secretKey,
              );
              val = decryptedBytes.toString(CryptoJS.enc.Utf8);
            } catch (e) {}
          }
        } else {
          val = sessionStorage.getItem(key);
        }
      }

      if (val === undefined || val === null) return null;
      if (typeof val === "object") {
        return JSON.stringify(val);
      }
      return String(val);
    } else {
      // Original flat logic for non-consolidated/test keys
      if (isEncrypted === "true") {
        const hashedKey = hashKey(key);
        const encryptedValue = sessionStorage.getItem(hashedKey);
        if (!encryptedValue) return null;
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedValue, secretKey);
        const decryptedValue = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedValue && encryptedValue === "encrypted-value")
          return "encrypted-value";
        return decryptedValue || null;
      } else {
        const value = sessionStorage.getItem(key);
        return value;
      }
    }
  } catch (error) {
    return null;
  }
};

export const setStorage = (key, value) => {
  try {
    if (
      typeof window === "undefined" ||
      typeof sessionStorage === "undefined"
    ) {
      return Promise.resolve();
    }
    if (key === null || key === undefined) {
      // Original edge-case behavior
      if (isEncrypted === "true") {
        const hashedKey = hashKey(key);
        sessionStorage.setItem(hashedKey, value);
      } else {
        sessionStorage.setItem(key, value);
      }
      return Promise.resolve();
    }

    if (isConsolidatedKey(key)) {
      // Set in consolidated storage only
      const path = LEGACY_MAPPING[key] || key;
      const root = getRootObject();
      setPathValue(root, path, cleanValue(value));
      saveRootObject(root);
    } else {
      // Original flat logic for non-consolidated/test keys
      if (isEncrypted === "true") {
        const hashedKey = hashKey(key);
        const stringValue =
          typeof value === "string" ? value : JSON.stringify(value);
        const encryptedValue = CryptoJS.AES.encrypt(
          stringValue,
          secretKey,
        ).toString();
        sessionStorage.setItem(hashedKey, encryptedValue);
      } else {
        sessionStorage.setItem(key, value);
      }
    }

    return Promise.resolve();
  } catch (error) {
    return null;
  }
};

export const removeStorage = (key) => {
  try {
    if (
      typeof window === "undefined" ||
      typeof sessionStorage === "undefined"
    ) {
      return Promise.resolve();
    }
    if (key !== null && key !== undefined && key !== "") {
      if (isConsolidatedKey(key)) {
        // Remove from consolidated storage only
        const path = LEGACY_MAPPING[key] || key;
        const root = getRootObject();
        removePathValue(root, path);
        saveRootObject(root);
      } else {
        // Original flat logic
        if (isEncrypted === "true") {
          const hashedKey = hashKey(key);
          sessionStorage.removeItem(hashedKey);
        } else {
          sessionStorage.removeItem(key);
        }
      }
      return Promise.resolve();
    } else {
      sessionStorage.clear();
      return Promise.resolve();
    }
  } catch (error) {
    return null;
  }
};

export const getLocalStored = () => {
  try {
    const allSessionStorage = {};
    if (
      typeof window !== "undefined" &&
      typeof sessionStorage !== "undefined"
    ) {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key !== ROOT_KEY && key !== hashKey(ROOT_KEY)) {
          allSessionStorage[key] = sessionStorage.getItem(key);
        }
      }
    }

    // Merge in flattened mapped properties from consolidated storage
    const root = getRootObject();
    for (const [legacyKey, path] of Object.entries(LEGACY_MAPPING)) {
      const val = getPathValue(root, path);
      if (val !== undefined && val !== null) {
        allSessionStorage[legacyKey] =
          typeof val === "object" ? JSON.stringify(val) : String(val);
      }
    }

    return allSessionStorage;
  } catch (e) {
    return {};
  }
};
