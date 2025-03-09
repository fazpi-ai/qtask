# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-03-09

### Added
- Redis-backed queue system for reliable job processing
- Publisher/Subscriber model for job distribution
- Job grouping by queues and groups
- Priority queuing for processing important jobs first
- Delayed job execution with configurable delay
- TTL support for automatic job expiration
- Job progress tracking during processing
- Connection pooling for efficient Redis connection management
- Atomic operations using Redis Lua scripts
- Customizable logging with multiple log levels
- TypeScript support with full type definitions
- Graceful shutdown handling for in-progress jobs

### Changed
- Build output directory changed from `src` to `dist`
- Improved error handling in job processing
- Enhanced Redis connection management

### Fixed
- Fixed issue with Redis script loading
- Resolved race conditions in job processing
