/**
 * Content Types
 * Type definitions for Content feature
 */

export interface Content {
  id: string;
  title: string;
  description?: string;
  content: string;
  contentType: 'text' | 'url' | 'html';
  isPremium: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentInput {
  title: string;
  description?: string;
  content: string;
  contentType?: 'text' | 'url' | 'html';
  isPremium?: boolean;
  tags?: string[];
}

export interface ContentResponse {
  id: string;
  title: string;
  description?: string;
  content: string;
  contentType: 'text' | 'url' | 'html';
  isPremium: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentUpdateInput {
  title?: string;
  description?: string;
  content?: string;
  contentType?: 'text' | 'url' | 'html';
  isPremium?: boolean;
  tags?: string[];
}