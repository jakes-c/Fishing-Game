import serial
import re
import time
from pynput.keyboard import Key, Controller

# Initialize the keyboard controller
keyboard = Controller()

# Configure the serial connection
ser = serial.Serial(
    port='COM7',
    baudrate=115200,  # You may need to adjust this to match your device's baud rate
    timeout=1
)

def parse_output(line):
    """Parse the output line to extract switch values"""
    switch_match = re.search(r'Switches:\s+(\d{6})', line)
    if switch_match:
        switch_values = switch_match.group(1)
        return switch_values
    return None

def simulate_keypress(key):
    """Simulate a key press and release"""
    keyboard.press(key)
    time.sleep(0.1)
    keyboard.release(key)

def process_switches(switches):
    """Process the switch configuration and simulate corresponding key presses"""
    # We'll use the 4 rightmost switches (positions 3-6) for WASD mapping
    # Format is 111010 (6 switches), we'll use switches[2:6]
    
    # Extract the switches we want to use for WASD (assuming rightmost 4 switches)
    switch_subset = switches[-4:]
    
    # Map to WASD based on positions
    # You can adjust the mapping according to your preference
    if switch_subset[0] == '1':  # 3rd position
        simulate_keypress('w')  # up
        print("Pressing 'w' key")
    
    if switch_subset[1] == '1':  # 4th position
        simulate_keypress('a')  # left
        print("Pressing 'a' key")
    
    if switch_subset[2] == '1':  # 5th position
        simulate_keypress('s')  # down
        print("Pressing 's' key")
    
    if switch_subset[3] == '1':  # 6th position
        simulate_keypress('d')  # right
        print("Pressing 'd' key")

def main():
    print("Starting COM7 to keyboard mapper...")
    print("Press Ctrl+C to exit")
    
    try:
        while True:
            # Read a line from the serial port
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()
                print(f"Received: {line}")
                
                # Parse the switches
                switches = parse_output(line)
                if switches:
                    print(f"Switch configuration: {switches}")
                    process_switches(switches)
            
            # Small delay to prevent CPU overuse
            time.sleep(0.1)
    
    except KeyboardInterrupt:
        print("Program terminated by user")
    
    finally:
        # Close the serial connection
        if ser.is_open:
            ser.close()
            print("Serial connection closed")

if __name__ == "__main__":
    main()