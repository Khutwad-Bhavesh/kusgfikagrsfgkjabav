# 🏍️ Onizuka OS (Great Teacher Linux)

> **"Lessons in Linux -- Never follow boring rules!"**

![Arch Linux](https://img.shields.io/badge/Base-Arch%20Linux-blue?logo=arch-linux)
![Desktop](https://img.shields.io/badge/Desktop-KDE%20Plasma-blueviolet?logo=kde)
![Build](https://img.shields.io/badge/Engine-archiso-success)
![Author](https://img.shields.io/badge/Author-Bhavesh%20Khutwad-orange)
![License](https://img.shields.io/badge/License-GPLv3-green)

**Onizuka OS** is a custom Arch Linux-based distribution built from scratch using `archiso`. Inspired by **Eikichi Onizuka** from *Great Teacher Onizuka (GTO)*, Onizuka OS combines a sleek, modern KDE Plasma desktop with a rebellious, high-energy terminal experience and custom system utilities.

Built as an Operating Systems diploma project by **Bhavesh Khutwad**.

---

## ✨ Features

- 🎨 **KDE Plasma Desktop**: Modern Wayland-native desktop suite with full graphics hardware acceleration (`mesa`, `vulkan`).
- 🔊 **PipeWire Audio Stack**: Next-gen audio management with PipeWire, WirePlumber, and volume controls out of the box.
- 📺 **Custom Terminal Branding**: Custom `motd` ASCII banner and shell prompt upon opening Konsole or terminal logins.
- 🤼 **Built-in GTO Easter Eggs & Shortcuts**:
  - `cresta`: *Wreck Vice Principal Uchiyamada's Toyota Cresta again!*
  - `suplex`: *Deliver a German Suplex to any system bug!*
  - `advice` / `gto-advice`: *Generates random Onizuka quotes & wisdom.*
  - `fuyutsuki`, `kadena`, `julia`: *Special character jokes & references.*
  - `update`, `install`, `remove`, `search`: *Convenient pacman wrapper aliases.*
- 🚀 **Desktop Installer**: Includes a 1-click **Install Onizuka OS** desktop launcher for system installation via `archinstall`.
- 🖼️ **Custom UEFI & GRUB Branding**: Bootloader menu titles and custom GTO splash screen.

---

## 📂 Repository Structure

```text
.
├── Onizuka/
│   └── releng/              # Master archiso build profile
│       ├── profiledef.sh    # Distro metadata, ISO label, file permissions
│       ├── packages.x86_64 # Curated package list (Plasma, PipeWire, Drivers)
│       ├── pacman.conf      # Repository & pacman configuration
│       ├── syslinux/        # Legacy BIOS bootloader configs & splash art
│       ├── grub/            # UEFI GRUB bootloader configuration
│       ├── efiboot/         # systemd-boot loader entries
│       └── airootfs/        # Root filesystem overlay
│           ├── etc/motd     # Terminal ASCII welcome banner
│           ├── etc/skel/    # User home directory templates & .bashrc
│           └── usr/local/   # Custom binaries & GTO scripts
├── .gitignore               # Excludes build caches and compiled ISOs
└── README.md                # Project documentation
```

---

## 🛠️ How to Build Onizuka OS

### Prerequisites

You need an Arch Linux environment with `archiso` installed:

```bash
sudo pacman -S archiso qemu-desktop
```

### Build Commands

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/Onizuka-OS.git
   cd Onizuka-OS
   ```

2. **Build the ISO**:
   ```bash
   mkdir -p ~/iso/out
   sudo rm -rf ~/iso/work
   sudo mkarchiso -v -w ~/iso/work -o ~/iso/out ./Onizuka/releng
   ```

3. **Output**:
   Your compiled ISO will be created at:
   `~/iso/out/onizuka-YYYY.MM.DD-x86_64.iso`

---

## 🧪 Testing in QEMU Virtual Machine

Test your built ISO in a virtual machine instantly:

```bash
qemu-system-x86_64 \
  -m 4G \
  -smp 4 \
  -enable-kvm \
  -cdrom ~/iso/out/onizuka-*.iso \
  -boot d
```

---

## 📜 License & Copyright Disclaimer

### Code & Distribution License
The build scripts, profile configurations, and custom shell scripts in this repository are released under the **GNU General Public License v3.0 (GPLv3)**.

### Fan Art & Anime Attribution Disclaimer
> **Notice**: **Onizuka OS** is a non-commercial, fan-made educational project created strictly for an academic Operating Systems diploma demonstration. *Great Teacher Onizuka (GTO)*, its character names, artwork, and associated intellectual property are trademarks and copyrights of **Tohru Fujisawa**, **Kodansha**, and **Studio Pierrot**. No copyright infringement is intended.

---

## 👨‍💻 Author & Credits

- **Base Distribution**: [Arch Linux](https://archlinux.org/) (GPL)
- **Build Engine**: [archiso](https://wiki.archlinux.org/title/archiso) (GPL)
- **Desktop Environment**: [KDE Plasma](https://kde.org/plasma-desktop/) (GPL/LGPL)
- **Author**: Bhavesh Khutwad
- Dedicated with respect to *Great Teacher Onizuka*! 👊🏍️

