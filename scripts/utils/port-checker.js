const { execSync } = require('child_process');
const os = require('os');

/**
 * ตรวจสอบว่ามี process ใช้ port อยู่หรือไม่
 * @param {string|number} port - Port number
 * @returns {Array<{pid: string, name: string}>} Array of process info
 */
function checkPort(port) {
  const platform = os.platform();
  const processes = [];

  if (platform === 'win32') {
    // Windows
    try {
      const findPortCmd = `netstat -ano | findstr :${port} | findstr LISTENING`;
      const result = execSync(findPortCmd, { encoding: 'utf8' });
      
      if (!result.trim()) {
        return processes;
      }
      
      const lines = result.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      }
      
      for (const pid of pids) {
        try {
          const processInfo = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV`, { encoding: 'utf8' });
          const processName = processInfo.split('\n')[1]?.split(',')[0]?.replace(/"/g, '') || 'Unknown';
          processes.push({ pid, name: processName });
        } catch {
          processes.push({ pid, name: 'Unknown' });
        }
      }
    } catch {
      // ไม่พบ process
    }
  } else {
    // Linux/Mac
    try {
      const pid = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
      if (!pid) {
        return processes;
      }
      
      const pids = pid.split('\n').filter(p => p);
      for (const p of pids) {
        try {
          const processName = execSync(`ps -p ${p} -o comm=`, { encoding: 'utf8' }).trim();
          processes.push({ pid: p, name: processName || 'Unknown' });
        } catch {
          processes.push({ pid: p, name: 'Unknown' });
        }
      }
    } catch {
      // ไม่พบ process
    }
  }
  
  return processes;
}

/**
 * หยุด process ที่ใช้ port
 * @param {string|number} port - Port number
 * @param {boolean} force - Force kill (default: true)
 * @returns {boolean} true if successful
 */
function killPort(port, force = true) {
  const platform = os.platform();
  const processes = checkPort(port);
  
  if (processes.length === 0) {
    return false;
  }
  
  if (platform === 'win32') {
    // Windows
    for (const { pid } of processes) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch {
        // Ignore errors
      }
    }
  } else {
    // Linux/Mac
    for (const { pid } of processes) {
      try {
        execSync(`kill ${force ? '-9' : ''} ${pid}`, { stdio: 'ignore' });
      } catch {
        // Ignore errors
      }
    }
  }
  
  return true;
}

module.exports = {
  checkPort,
  killPort,
};

