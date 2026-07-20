import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  email: string | null;
  roles: string[];
  employeeId: string | null;
  id: string | null;
  isAuthenticated: boolean;
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
    };
  }
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const username = localStorage.getItem('username');
  const email = localStorage.getItem('email');
  const roles = JSON.parse(localStorage.getItem('roles') || '[]');
  const employeeId = localStorage.getItem('employeeId');
  const id = localStorage.getItem('userId');

  return {
    token,
    refreshToken,
    username,
    email,
    roles,
    employeeId,
    id,
    isAuthenticated: !!token,
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
      }>
    ) => {
      const { token, refreshToken, username, email, roles, employeeId, id } = action.payload;
      state.token = token;
      state.refreshToken = refreshToken;
      state.username = username;
      state.email = email;
      state.roles = roles;
      state.employeeId = employeeId;
      state.id = id;
      state.isAuthenticated = true;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('username', username);
      localStorage.setItem('email', email);
      localStorage.setItem('roles', JSON.stringify(roles));
      if (employeeId) localStorage.setItem('employeeId', employeeId);
      localStorage.setItem('userId', id);
    },
    updateToken: (state, action: PayloadAction<{ token: string; refreshToken: string }>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
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

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('roles');
      localStorage.removeItem('employeeId');
      localStorage.removeItem('userId');
    },
  },
});

export const { setCredentials, updateToken, logout } = authSlice.actions;
export default authSlice.reducer;
