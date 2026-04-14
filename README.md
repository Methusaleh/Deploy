Project Title: Deploy

What is Deploy?
Deploy is a professional-grade Kanban board application designed to help teams organize tasks and collaborate in real-time. It allows users to create boards, manage task cards across different columns, and see exactly who else is working on the project at any given moment.

Core Features

1. Real-Time Collaboration: See updates instantly. When a teammate moves a card or joins a board, you see it happen without refreshing your page.
2. Team Presence: A "Facepile" feature in the header shows which team members are currently active on the board, indicated by a real-time green status dot.
3. Task Management: Create, edit, and move cards through different stages of a project.
4. Secure Authentication: Private accounts and secure login ensure that your boards and data stay protected.
5. Instant Notifications: Receive real-time alerts for board invitations and project updates.

The Technology Stack

1. Frontend: Built with React for a fast, responsive user interface.
2. Backend: Powered by FastAPI (Python) to handle data and security efficiently.
3. Database: Utilizes a PostgreSQL database (hosted on Neon) for reliable data storage.
4. Real-Time Engine: Uses Socket.io to facilitate instant communication between the server and all connected users.
5. Infrastructure: The app is containerized using Docker and deployed using Google Cloud Run for the backend and Vercel for the frontend.

Development Team
Created by Aaron Matthew Kipf as a Capstone project for the Enterprise Developer program at Francis Tuttle Technology Center.
