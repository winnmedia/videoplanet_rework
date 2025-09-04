export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  bio?: string;
  company?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface UpdateUserDto {
  name?: string;
  bio?: string;
  company?: string;
  location?: string;
  website?: string;
  avatar?: string;
}