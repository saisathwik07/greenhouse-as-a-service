const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { requireTicketAdmin } = require("../middleware/ticketAdmin");
const {
  ticketUpload,
  multerErrorHandler,
} = require("../middleware/uploads");
const {
  createTicket,
  listMyTickets,
  getTicket,
  listAllTickets,
  replyAsAdmin,
  replyAsUser,
  updateStatus,
  updatePriority,
} = require("../controllers/ticketController");

const router = express.Router();

router.use(authenticate);

/* User */
router.post(
  "/create",
  ticketUpload.array("screenshots", 5),
  multerErrorHandler,
  createTicket
);
router.get("/my", listMyTickets);
router.post(
  "/reply-user/:ticketId",
  ticketUpload.array("screenshots", 5),
  multerErrorHandler,
  replyAsUser
);

/* Admin */
router.get("/all", requireTicketAdmin, listAllTickets);
router.post(
  "/reply/:ticketId",
  requireTicketAdmin,
  ticketUpload.array("screenshots", 5),
  multerErrorHandler,
  replyAsAdmin
);
router.put("/status/:ticketId", requireTicketAdmin, updateStatus);
router.put("/priority/:ticketId", requireTicketAdmin, updatePriority);

/* Either party — owner or admin can fetch a single ticket. */
router.get("/:id", getTicket);

module.exports = router;
