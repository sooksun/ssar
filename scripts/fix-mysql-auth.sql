-- แก้ปัญหา MySQL Authentication Plugin สำหรับ Laragon
-- รันคำสั่งนี้ใน MySQL (ผ่าน HeidiSQL หรือ MySQL Workbench)

-- วิธีที่ 1: เปลี่ยน authentication method ของ user 'app'
ALTER USER 'app'@'localhost' IDENTIFIED WITH mysql_native_password BY 'app123';
FLUSH PRIVILEGES;

-- วิธีที่ 2: ถ้าใช้ root user
-- ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
-- FLUSH PRIVILEGES;

-- ตรวจสอบ authentication plugin
SELECT user, host, plugin FROM mysql.user WHERE user IN ('app', 'root');

