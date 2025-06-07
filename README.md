# MHVN

MHVN stands for MongoDB, HyperExpress, Vue, Node.js. It's an all-in-one solution for building monolith web app with Vue3, HyperExpress, MongoDB, Node.js.

### Backend (be)
- mongodb with predefined collections (User, DAU, DbMigration, HealthCheck, API Metric, FileStorage, SystemConfig, Tasks, Notification, Announcement).
- Built-in database migration workflow.
- Built-in authentication using JSON web token.
- User API: predefined api to create user, modifier user profile, forgot password, recover password via email, delete account request & cancel.
- Hmm API: query mongoose directly from the frontend side.
- System config API: shared storage for both fe + be.
- Notification API
- Built-in API metric: meter api call, average ms spent on each API call.
- Built-in cronjob workflow.
- Built-in long task workflow.
- App hooks.
- Realtime: SocketIO + Redis + Cluster
- Distributed logging support (winston + axiom)
- Storage service: S3
- Email sender
- Docker script to build & publish container.
- GitHub action auto build on release

### Frontend (fe)
- vue3 + vite + UnoCSS
- vitest (coming soon)
- predefined CSS rules (of course, you can use another plugin)
- predefined Vue components: input, load data, data table, dialog service, message box, notification, image slide, image viewer, pulse block, tooltip, progress bar, spacer, icon, date time format, imgx, paging,...
- predefined template: admin dashboard
- built-in utility class to work with provided backend API.
- Hmm client: query mongoose directly from the front-end side.
- hook
- caching
- file uploader
- log pipe: reading backend log directly from the frontend in realtime.
- view logger
- dashboard with API metric in a chart or table.
- built-in authentication (jsonwebtoken).
- and a lot more...

### Example images

Dashboard with API metric in chart & health check
![admin-dashboard.png](images%2Fadmin-dashboard-1.png)

System config
![system-config.png](images%2Fsystem-config.png)

File System
![file-system.png](images%2Ffile-system-1.png)

### Research
- https://dev.to/samchon/typia-15000x-faster-validator-and-its-histories-1fmg
- https://dev.to/samchon/i-made-express-faster-than-fastify-4h8g
- https://github.com/honojs/hono/

### TODO
- API input validation (like zod)
- domain driven design (considering)
- i18n
- unit test
- e2e test
- Auth0, Clerk integration
- more UI components
- improve Dockerfile build
