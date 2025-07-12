import { execSync } from 'child_process';
import { platform } from 'os';

function checkUbuntuDependencies() {
  if (platform() !== 'linux') return;
  
  try {
    // Check if we're on Ubuntu/Debian
    const osRelease = execSync('cat /etc/os-release').toString();
    if (!osRelease.includes('Ubuntu') && !osRelease.includes('Debian')) {
      return;
    }

    console.log('Checking system dependencies...');
    
    // Check for required libraries
    const requiredPackages = [
      'build-essential',
      'libvips',
      'libvips-dev'
    ];

    let missingPackages = [];
    
    for (const pkg of requiredPackages) {
      try {
        execSync(`dpkg -l ${pkg}`);
      } catch {
        missingPackages.push(pkg);
      }
    }

    if (missingPackages.length > 0) {
      console.warn('\n⚠️  Missing required system packages for optimal performance:');
      console.warn(missingPackages.join(', '));
      console.warn('\nPlease install them using:');
      console.warn(`sudo apt-get update && sudo apt-get install -y ${missingPackages.join(' ')}`);
      console.warn('\nContinuing installation, but the package may not work correctly...\n');
    } else {
      console.log('✅ All system dependencies are installed');
    }
  } catch (err) {
    console.warn('⚠️ Could not check system dependencies:', err.message);
  }
}

checkUbuntuDependencies(); 