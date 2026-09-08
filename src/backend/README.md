# Backend architecture

Backend code owns persistence, authentication, authorization, notifications, email orchestration and private administration operations.

The browser must never be trusted to enforce admin authorization, application status changes or private document access.
