import { getConnection } from "../config/db.js";

export async function create(data) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT MAX(TO_NUMBER(REGEXP_SUBSTR(INDENT_NUMBER, '[0-9]+'))) AS LAST_NUM FROM STORE_INDENT`
    );
    const lastNum = result.rows[0][0] || 0;
    const indentNumber = `SI-${String(lastNum + 1).padStart(4, "0")}`;

    await conn.execute(
      `INSERT INTO STORE_INDENT (
         TIMESTAMP, INDENT_NUMBER, INDENTER_NAME, DEPARTMENT, GROUP_HEAD,
         ITEM_CODE, PRODUCT_NAME, QUANTITY, UOM, SPECIFICATIONS,
         INDENT_APPROVED_BY, INDENT_TYPE, ATTACHMENT
       ) VALUES (
         TO_TIMESTAMP(:timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
         :indentNumber, :indenterName, :department, :groupHead,
         :itemCode, :productName, :quantity, :uom, :specifications,
         :indentApprovedBy, :indentType, :attachment
       )`,
      { ...data, indentNumber },
      { autoCommit: true }
    );

    return { message: "Indent saved successfully", indentNumber };
  } finally {
    await conn.close();
  }
}

export async function approve({ indentNumber, itemCode, vendorType, approvedQuantity }) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE STORE_INDENT
       SET VENDOR_TYPE = :vendorType,
           APPROVED_QUANTITY = :approvedQuantity,
           ACTUAL_1 = SYSDATE
       WHERE INDENT_NUMBER = :indentNumber
         AND ITEM_CODE = :itemCode`,
      { indentNumber, itemCode, vendorType, approvedQuantity },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function getPending() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         t0.vrno AS indent_number,
         t0.vrdate AS indent_date,
         t0.indent_remark AS indenter,
         lhs_utility.get_name('div_code', t1.div_code) AS division,
         lhs_utility.get_name('dept_code', t0.dept_code) AS department,
         t1.item_code,
         lhs_utility.get_name('item_code', t1.item_code) AS item_name,
         t1.remark AS specification,
         t1.qtyindent,
         t1.um,
         t1.purpose_remark,
         t1.acknowledgedate
       FROM indent_head t0
       INNER JOIN indent_body t1 ON t0.vrno = t1.vrno
       WHERE t0.entity_code = 'SR'
         AND t0.vrno NOT IN (SELECT a.indent_vrno FROM order_body a WHERE a.indent_vrno IS NOT NULL)
         AND t1.cancelleddate IS NULL
         AND t0.createddate >= TO_DATE('01-APR-2025', 'DD-MON-YYYY')
       ORDER BY t0.vrdate ASC`,
      [],
      { outFormat: 4002 } // oracledb.OUT_FORMAT_OBJECT
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function getHistory() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM STORE_INDENT WHERE PLANNED_1 IS NOT NULL AND ACTUAL_1 IS NOT NULL`,
      [],
      { outFormat: 4002 }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}




