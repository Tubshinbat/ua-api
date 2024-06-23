const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/protect");

const {
  getSlugEmployee,
  createEmployee,
  getEmployees,
  getCountEmployee,
  multDeleteEmployee,
  getEmployee,
  updateEmployee,
  changePosition,
} = require("../controller/Employee");

router
  .route("/")
  .post(protect, authorize("admin", "operator"), createEmployee)
  .get(getEmployees);

router.route("/s/:slug").get(getSlugEmployee);

router
  .route("/change")
  .post(protect, authorize("admin", "operator"), changePosition);

router
  .route("/count")
  .get(protect, authorize("admin", "operator"), getCountEmployee);
router.route("/delete").delete(protect, authorize("admin"), multDeleteEmployee);

router.route("/change").post(protect, authorize("admin"), changePosition);

router
  .route("/:id")
  .get(getEmployee)
  .put(protect, authorize("admin", "operator"), updateEmployee);

module.exports = router;
