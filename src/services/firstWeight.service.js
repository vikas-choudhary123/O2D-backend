import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

// 🟢 Pending
export async function getPendingFirstWeight(offset = 0, limit = 50) {
  const query = `
    SELECT * FROM (
      SELECT a.*, ROWNUM rnum FROM (
        SELECT 
          t.vrdate + INTERVAL '15' MINUTE AS planned_timestamp,
          t.order_vrno,
          t.vrno,
          lhs_utility.get_name('acc_code', t.acc_code) AS party_name,
          t.truckno,
          t.driver_name,
          t.driver_mobile,
          t.driver_driving_license
        FROM view_gatetran_engine t
        WHERE t.entity_code = 'SR'
          AND t.order_tcode = 'O'
          AND (SELECT DISTINCT a.div_code 
              FROM view_order_engine a WHERE a.vrno = t.order_vrno) = 'PM'
          AND t.wslip_no IS NULL
          AND t.vrdate >= TRUNC(SYSDATE)
        ORDER BY t.vrdate + INTERVAL '15' MINUTE ASC
      ) a
      WHERE ROWNUM <= :endRow
    )
    WHERE rnum > :startRow
  `;

  const params = { startRow: offset, endRow: offset + limit };
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    if (connection) await connection.close();
  }
}

export async function getFirstWeightHistory(offset = 0, limit = 50) {
  const query = `
    SELECT * FROM (
      SELECT a.*, ROWNUM rnum FROM (
        SELECT DISTINCT 
          t.vrdate + INTERVAL '15' MINUTE AS planned_timestamp,
          (SELECT DISTINCT a.indate FROM view_weighbridge_engine a 
            WHERE a.gate_vrno = t.vrno AND a.slno = 1) AS actual_timestamp,
          t.order_vrno,
          t.vrno,
          t.wslip_no,
          lhs_utility.get_name('acc_code', t.acc_code) AS party_name,
          t.truckno,
          t.driver_name,
          t.driver_mobile,
          t.driver_driving_license
        FROM view_gatetran_engine t
        WHERE t.entity_code = 'SR'
          AND t.wslip_no IS NOT NULL
          AND (SELECT DISTINCT a.div_code 
            FROM view_weighbridge_engine a WHERE a.gate_vrno = t.vrno AND a.slno = 1) = 'PM'
          AND SUBSTR(t.vrno, 1, 2) = 'SE'
          AND t.vrdate >= TO_DATE('01-apr-2025', 'dd-mon-yyyy')
        ORDER BY t.vrdate + INTERVAL '15' MINUTE ASC
      ) a
      WHERE ROWNUM <= :endRow
    )
    WHERE rnum > :startRow
  `;

  const params = { startRow: offset, endRow: offset + limit };
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } finally {
    if (connection) await connection.close();
  }
}
