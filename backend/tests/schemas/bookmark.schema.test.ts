import { describe, expect, it } from 'vitest';
import { getPathType } from '../../src/schemas/bookmark.schema.js';

describe('bookmark.schema', () => {
  describe('getPathType', () => {
    it('should identify HTTP/HTTPS URLs as "url"', () => {
      expect(getPathType('https://example.com')).toBe('url');
      expect(getPathType('http://example.com/path?query=1')).toBe('url');
      expect(getPathType('HTTPS://EXAMPLE.COM')).toBe('url');
    });

    it('should identify FTP/SFTP as "network"', () => {
      expect(getPathType('ftp://ftp.example.com/file.zip')).toBe('network');
      expect(getPathType('ftps://ftp.example.com/file.zip')).toBe('network');
      expect(getPathType('sftp://user@server/path')).toBe('network');
      expect(getPathType('ssh://user@server/path')).toBe('network');
    });

    it('should identify SMB/DAV as "network"', () => {
      expect(getPathType('smb://server/share/folder')).toBe('network');
      expect(getPathType('dav://server/webdav')).toBe('network');
      expect(getPathType('davs://server/webdav')).toBe('network');
    });

    it('should identify file:// URIs correctly', () => {
      // Local file URI
      expect(getPathType('file:///C:/Users/file.txt')).toBe('file');
      expect(getPathType('file:///home/user/file.txt')).toBe('file');

      // Network file URI
      expect(getPathType('file://server/share/file.txt')).toBe('network');
    });

    it('should identify Windows UNC paths as "network"', () => {
      expect(getPathType('\\\\server\\share')).toBe('network');
      expect(getPathType('\\\\fileserver\\shared\\docs\\file.txt')).toBe('network');
    });

    it('should identify Long UNC paths as "network"', () => {
      expect(getPathType('\\\\?\\UNC\\server\\share')).toBe('network');
      expect(getPathType('\\\\?\\UNC\\fileserver\\shared\\file.txt')).toBe('network');
    });

    it('should identify Windows device paths as "file"', () => {
      expect(getPathType('\\\\.\\PhysicalDrive0')).toBe('file');
      expect(getPathType('\\\\.\\COM1')).toBe('file');
    });

    it('should identify Windows Long paths as "file"', () => {
      expect(getPathType('\\\\?\\C:\\very\\long\\path')).toBe('file');
    });

    it('should identify Windows drive letters as "file"', () => {
      expect(getPathType('C:\\Users\\file.txt')).toBe('file');
      expect(getPathType('D:/Documents/file.md')).toBe('file');
    });

    it('should identify Unix absolute paths as "file"', () => {
      expect(getPathType('/home/user/file.txt')).toBe('file');
      expect(getPathType('/Users/user/Documents/file.md')).toBe('file');
    });

    it('should identify home directory paths as "file"', () => {
      expect(getPathType('~/Documents/file.txt')).toBe('file');
      expect(getPathType('~/.config/settings.json')).toBe('file');
    });

    it('should identify custom protocols as "url"', () => {
      expect(getPathType('vscode://file/path/to/file')).toBe('url');
      expect(getPathType('obsidian://open?vault=test')).toBe('url');
    });

    it('should default to "file" for unknown patterns', () => {
      expect(getPathType('relative/path/file.txt')).toBe('file');
    });
  });
});
