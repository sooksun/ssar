const { spawn } = require('child_process');
const path = require('path');
const { getIPv4Addresses, getPrimaryIPv4Address } = require('./utils/network');
const { checkPort, killPort } = require('./utils/port-checker');

const port = process.env.PORT || '3000';
const host = process.env.HOSTNAME || process.env.HOST || '0.0.0.0';
const projectRoot = path.resolve(__dirname, '..');
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

// ตรวจสอบและหยุด process ที่ใช้ port อยู่
const existingProcesses = checkPort(port);
if (existingProcesses.length > 0) {
  console.log(`\n⚠️  พบ process ที่ใช้ port ${port} อยู่:`);
  for (const proc of existingProcesses) {
    console.log(`   - ${proc.name} (PID: ${proc.pid})`);
  }
  console.log('กำลังหยุด process เหล่านี้...\n');
  killPort(port, true);
  // รอสักครู่ให้ process หยุด
  setTimeout(() => {
    startServer();
  }, 500);
} else {
  startServer();
}

function startServer() {
  const addresses = getIPv4Addresses();
  const primaryAddress = getPrimaryIPv4Address() || '127.0.0.1';

  // แสดง URL ที่ถูกต้องก่อน
  printUrls(port);

  const child = spawn(
    process.execPath,
    [nextBin, 'dev', '-p', port, '-H', host],
    {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: { ...process.env, HOSTNAME: host, PORT: port },
    }
  );

  // Intercept stdout และ replace 0.0.0.0 ด้วย IP จริง (เฉพาะใน URL display)
  child.stdout.on('data', (data) => {
    let output = data.toString();
    // Replace เฉพาะในบรรทัดที่แสดง URL (ไม่ replace ใน error messages)
    if (addresses.length > 0 && !output.includes('Error:') && !output.includes('EADDRINUSE')) {
      // Replace ในบรรทัดที่มี "Network:" หรือ "Local:" หรือ "http://"
      output = output.replace(/(Network:\s+http:\/\/)0\.0\.0\.0/g, `$1${primaryAddress}`);
      output = output.replace(/(Local:\s+http:\/\/)0\.0\.0\.0/g, `$1${primaryAddress}`);
      output = output.replace(/(http:\/\/)0\.0\.0\.0(\:\d+)/g, `$1${primaryAddress}$2`);
    }
    process.stdout.write(output);
  });

  // Intercept stderr - ไม่ replace ใน error messages
  child.stderr.on('data', (data) => {
    // ไม่ replace ใน stderr เพื่อให้ error messages ถูกต้อง
    process.stderr.write(data);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

function printUrls(portToUse) {
  const addresses = getIPv4Addresses();
  const primary = getPrimaryIPv4Address();

  console.log('\nสามารถเข้าถึงแอปได้ที่:');
  console.log(`  Local:    http://localhost:${portToUse}`);
  if (addresses.length === 0) {
    console.log(`  Network:  http://127.0.0.1:${portToUse}`);
  } else {
    for (const addr of addresses) {
      console.log(`  Network:  http://${addr}:${portToUse}`);
    }
  }
  if (!primary) {
    console.log('\n⚠️  ไม่พบ IPv4 ภายนอกในเครื่องนี้ หากต้องการแชร์ในเครือข่าย โปรดตรวจสอบการ์ดเครือข่าย.');
  }
  console.log('');
}
