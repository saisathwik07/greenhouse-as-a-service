const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { requireTicketAdmin } = require("../middleware/ticketAdmin");
const {
  createTicket,
  listMyTickets,
  listAllTickets,
  replyAsAdmin,
  replyAsUser,
  updateStatus,
} = require("../controllers/ticketController");

const router = express.Router();

router.use(authenticate);

/** User-only: own tickets */
router.post("/create", createTicket);
router.get("/my", listMyTickets);
router.post("/reply-user/:ticketId", replyAsUser);

/** Admin-only: JWT role === "admin" */
router.get("/all", requireTicketAdmin, listAllTickets);
router.post("/reply/:ticketId", requireTicketAdmin, replyAsAdmin);
router.put("/status/:ticketId", requireTicketAdmin, updateStatus);

module.exports = router;
