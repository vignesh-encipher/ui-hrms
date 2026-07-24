import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getStorage, setStorage, removeStorage } from '@/utils/storages';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  email: string | null;
  roles: string[];
  employeeId: string | null;
  id: string | null;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
}

const getInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      token: null,
      refreshToken: null,
      username: null,
      email: null,
      roles: [],
      employeeId: null,
      id: null,
      isAuthenticated: false,
      isFirstLogin: false,
    };
  }
  const token = getStorage('token');
  const refreshToken = getStorage('refreshToken');
  const username = getStorage('username');
  const email = getStorage('email');
  const rolesRaw = getStorage('roles');
  const roles = rolesRaw ? JSON.parse(rolesRaw) : [];
  const employeeId = getStorage('employeeId');
  const id = getStorage('userId');
  const isFirstLoginRaw = getStorage('isFirstLogin');
  const isFirstLogin = isFirstLoginRaw === 'true';

  return {
    token,
    refreshToken,
    username,
    email,
    roles,
    employeeId,
    id,
    isAuthenticated: !!token,
    isFirstLogin,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        refreshToken: string;
        username: string;
        email: string;
        roles: string[];
        employeeId: string | null;
        id: string;
        isFirstLogin: boolean;
      }>
    ) => {
      const { token, refreshToken, username, email, roles, employeeId, id, isFirstLogin } = action.payload;
      state.token = token;
      state.refreshToken = refreshToken;
      state.username = username;
      state.email = email;
      state.roles = roles;
      state.employeeId = employeeId;
      state.id = id;
      state.isAuthenticated = true;
      state.isFirstLogin = isFirstLogin;

      setStorage('token', token);
      setStorage('refreshToken', refreshToken);
      setStorage('username', username);
      setStorage('email', email);
      setStorage('roles', JSON.stringify(roles));
      if (employeeId) setStorage('employeeId', employeeId);
      setStorage('userId', id);
      setStorage('isFirstLogin', isFirstLogin ? 'true' : 'false');
    },
    updateToken: (state, action: PayloadAction<{ token: string; refreshToken: string }>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      setStorage('token', action.payload.token);
      setStorage('refreshToken', action.payload.refreshToken);
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.username = null;
      state.email = null;
      state.roles = [];
      state.employeeId = null;
      state.id = null;
      state.isAuthenticated = false;
      state.isFirstLogin = false;

      removeStorage('token');
      removeStorage('refreshToken');
      removeStorage('username');
      removeStorage('email');
      removeStorage('roles');
      removeStorage('employeeId');
      removeStorage('userId');
      removeStorage('isFirstLogin');
    },
  },
});

export const { setCredentials, updateToken, logout } = authSlice.actions;
export default authSlice.reducer;
