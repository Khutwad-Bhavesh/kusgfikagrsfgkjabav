# --- Onizuka OS Shell Configuration ---

# Automatically print Onizuka ASCII banner on terminal start
if [ -f /etc/motd ]; then
    cat /etc/motd
fi

# Run fastfetch if installed
if command -v fastfetch &> /dev/null; then
    echo ""
    fastfetch
fi

# --- Rebellious & Useful Aliases ---
alias gto="cat /etc/motd"
alias update="sudo pacman -Syu"
alias install="sudo pacman -S"
alias remove="sudo pacman -Rns"
alias search="pacman -Ss"
alias cls="clear"

# Colorize default commands
alias ls='ls --color=auto'
alias grep='grep --color=auto'

# --- GTO Easter Eggs & Jokes ---
alias cresta="echo -e '\033[1;31m💥 BOOM! Vice Principal Uchiyamada'\''s Cresta just got wrecked again! 🚗💨\033[0m'"
alias suplex="echo -e '\033[1;33m🤼‍♂️ EIKICHI ONIZUKA DELIVERS A PERFECT GERMAN SUPLEX TO THE BUG! 💥\033[0m'"
alias advice="gto-advice"
alias fuyutsuki="echo -e '\033[1;35m😍 Fuyutsuki-sensei just walked by! Onizuka is trying to act like an angel 😇\033[0m'"
alias kadena="echo -e '\033[1;36m🩺 Kadena-sensei: \"Onizuka, did you miss your health checkup?\" 😳💥\033[0m'"
alias julia="echo -e '\033[1;35m😍 Julia Murai (Kunio'\''s mom) smiles! Onizuka: \"I'\''m 22, single, and ready!\" 💥 (Kunio: \"STAY AWAY FROM MY MOM ONIZUKA!\")\033[0m'"