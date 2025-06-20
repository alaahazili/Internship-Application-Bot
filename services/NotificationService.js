class NotificationService {
    constructor(io) {
        this.io = io;
    }

    sendToUser(userId, event, data) {
        if (!this.io) return;
        this.io.to(`user-${userId}`).emit(event, data);
    }

    broadcast(event, data) {
        if (!this.io) return;
        this.io.emit(event, data);
    }

    async sendFollowUpReminders() {
        // Placeholder: implement logic to send follow-up reminders to users
        // e.g., check applications with pending follow-ups and notify users
    }
}

module.exports = NotificationService; 