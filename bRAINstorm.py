import pygame
import random
import sys
from enum import Enum

pygame.init()

# Constants
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 720
FPS = 60
RAINDROPS_START_Y = -50
RAINDROP_SIZE = 80
RAINDROP_MISS_Y = SCREEN_HEIGHT - 300

# Colors
WHITE = (255, 255, 255)
BLACK = (18, 24, 38)
BG_TOP = (22, 43, 78)
BG_BOTTOM = (75, 135, 179)
PANEL = (247, 251, 255)
PANEL_ALT = (232, 242, 250)
PANEL_BORDER = (157, 190, 213)
TEXT_MUTED = (88, 111, 132)
ACCENT = (18, 150, 155)
ACCENT_DARK = (8, 106, 119)
RED = (224, 82, 82)
GREEN = (64, 196, 125)
AMBER = (249, 188, 74)
CYAN = (79, 210, 226)
KEY_BG = (42, 65, 88)
KEY_BG_HOVER = (55, 84, 111)

class Operation(Enum):
    ADD = 1
    SUBTRACT = 2
    MULTIPLY = 3
    DIVIDE = 4

class Raindrop:
    def __init__(self, x, y, operation, num1, num2, speed):
        self.x = x
        self.y = y
        self.speed = speed
        self.operation = operation
        self.num1 = num1
        self.num2 = num2
        self.size = RAINDROP_SIZE
        
    def get_problem_text(self):
        ops = {
            Operation.ADD: f"{self.num1} + {self.num2}",
            Operation.SUBTRACT: f"{self.num1} - {self.num2}",
            Operation.MULTIPLY: f"{self.num1} x {self.num2}",
            Operation.DIVIDE: f"{self.num1} / {self.num2}"
        }
        return ops[self.operation]
    
    def get_answer(self):
        if self.operation == Operation.ADD:
            return self.num1 + self.num2
        elif self.operation == Operation.SUBTRACT:
            return self.num1 - self.num2
        elif self.operation == Operation.MULTIPLY:
            return self.num1 * self.num2
        elif self.operation == Operation.DIVIDE:
            return int(self.num1 / self.num2)
    
    def update(self):
        self.y += self.speed
    
    def is_off_screen(self):
        return self.y > RAINDROP_MISS_Y

class Game:
    STATE_MENU = "menu"
    STATE_PLAYING = "playing"
    STATE_GAME_OVER = "game_over"
    KEY_TO_DIGIT = {
        pygame.K_0: '0',
        pygame.K_1: '1',
        pygame.K_2: '2',
        pygame.K_3: '3',
        pygame.K_4: '4',
        pygame.K_5: '5',
        pygame.K_6: '6',
        pygame.K_7: '7',
        pygame.K_8: '8',
        pygame.K_9: '9',
        pygame.K_KP0: '0',
        pygame.K_KP1: '1',
        pygame.K_KP2: '2',
        pygame.K_KP3: '3',
        pygame.K_KP4: '4',
        pygame.K_KP5: '5',
        pygame.K_KP6: '6',
        pygame.K_KP7: '7',
        pygame.K_KP8: '8',
        pygame.K_KP9: '9',
    }
    SCANCODE_TO_CHAR = {
        # Number row (layout independent)
        39: '0', 30: '1', 31: '2', 32: '3', 33: '4',
        34: '5', 35: '6', 36: '7', 37: '8', 38: '9',
        # Numpad
        98: '0', 89: '1', 90: '2', 91: '3', 92: '4',
        93: '5', 94: '6', 95: '7', 96: '8', 97: '9',
        # Minus keys
        45: '-', 86: '-'
    }
    SYMBOL_TO_DIGIT = {
        # Shifted number row (common US layout)
        '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
        # Unshifted number row (common AZERTY layout)
        '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5', 'è': '7', '_': '8', 'ç': '9', 'à': '0',
        # Common variants on other international layouts
        '§': '3', '/': '7', '=': '0',
        # Common alternatives seen on some layouts/IMEs
        '[': '8', ']': '9', '{': '7', '}': '0'
    }

    def __init__(self):
        self.fullscreen = False
        self.screen = self.create_display()
        self.clock = pygame.time.Clock()
        self.font_large = pygame.font.SysFont("segoe ui", 54, bold=True)
        self.font_medium = pygame.font.SysFont("segoe ui", 34, bold=True)
        self.font_input = pygame.font.Font(None, 58)
        self.font_input.set_bold(True)
        self.font_small = pygame.font.SysFont("segoe ui", 22)
        self.font_tiny = pygame.font.SysFont("segoe ui", 17)
        self.font_button = pygame.font.SysFont("segoe ui", 26, bold=True)
        self.font_problem = pygame.font.SysFont("segoe ui", 30, bold=True)
        self.font_problem_small = pygame.font.SysFont("segoe ui", 24, bold=True)
        self.font_problem_tiny = pygame.font.SysFont("segoe ui", 20, bold=True)
        self.background_surface = self.create_background_surface()

        self.state = self.STATE_MENU
        self.input_active = False
        self.skip_textinput_char = None
        self.skip_textinput_time = 0
        self.editing_text = ""
        self.input_flash_until = 0
        self.recent_answer_text = ""
        self.recent_answer_until = 0
        self.recent_answer_color = BLACK
        self.setup_ui()
        
        self.reset_game()

    def create_display(self):
        flags = pygame.SCALED | (pygame.FULLSCREEN if self.fullscreen else pygame.RESIZABLE)
        try:
            screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags)
        except pygame.error:
            fallback_flags = pygame.FULLSCREEN if self.fullscreen else pygame.RESIZABLE
            screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), fallback_flags)

        pygame.display.set_caption("Math Rain")
        return screen

    def toggle_fullscreen(self):
        self.fullscreen = not self.fullscreen
        self.screen = self.create_display()
        if self.input_active:
            pygame.key.set_text_input_rect(self.input_box)
        self.draw()

    def create_background_surface(self):
        surface = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
        for y in range(SCREEN_HEIGHT):
            ratio = y / max(1, SCREEN_HEIGHT - 1)
            color = self.blend_color(BG_TOP, BG_BOTTOM, ratio)
            pygame.draw.line(surface, color, (0, y), (SCREEN_WIDTH, y))
        return surface

    def blend_color(self, color_a, color_b, amount):
        return tuple(
            int(color_a[index] + (color_b[index] - color_a[index]) * amount)
            for index in range(3)
        )

    def draw_background(self):
        self.screen.blit(self.background_surface, (0, 0))
        ticks = pygame.time.get_ticks()
        for index in range(34):
            x = (index * 53 + ticks // 12) % (SCREEN_WIDTH + 80) - 40
            y = (index * 97 + ticks // 5) % (SCREEN_HEIGHT + 90) - 60
            length = 20 + (index % 5) * 5
            color = self.blend_color((140, 212, 230), WHITE, 0.25)
            pygame.draw.line(self.screen, color, (x, y), (x - 8, y + length), 1)

    def draw_text_with_shadow(self, text, font, color, center):
        shadow = font.render(text, True, (11, 25, 43))
        self.screen.blit(shadow, shadow.get_rect(center=(center[0] + 2, center[1] + 3)))
        surface = font.render(text, True, color)
        self.screen.blit(surface, surface.get_rect(center=center))

    def draw_panel(self, rect, fill=PANEL, border=PANEL_BORDER, radius=8, shadow=True):
        if shadow:
            shadow_surface = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
            pygame.draw.rect(shadow_surface, (9, 23, 41, 65), shadow_surface.get_rect(), border_radius=radius)
            self.screen.blit(shadow_surface, (rect.x, rect.y + 4))

        pygame.draw.rect(self.screen, fill, rect, border_radius=radius)
        pygame.draw.rect(self.screen, border, rect, width=2, border_radius=radius)

    def setup_ui(self):
        self.play_button = pygame.Rect(SCREEN_WIDTH // 2 - 115, SCREEN_HEIGHT // 2 + 48, 230, 62)
        self.replay_button = pygame.Rect(SCREEN_WIDTH // 2 - 115, SCREEN_HEIGHT // 2 + 26, 230, 56)
        self.quit_button = pygame.Rect(SCREEN_WIDTH // 2 - 115, SCREEN_HEIGHT // 2 + 94, 230, 56)
        self.input_box = pygame.Rect(130, SCREEN_HEIGHT - 280, SCREEN_WIDTH - 260, 62)

        self.keyboard_buttons = []
        key_w = 104
        key_h = 42
        gap = 10
        start_x = (SCREEN_WIDTH - (4 * key_w + 3 * gap)) // 2
        start_y = SCREEN_HEIGHT - 200

        rows = [
            ["7", "8", "9", "Back"],
            ["4", "5", "6", "-"],
            ["1", "2", "3", "0"],
        ]

        for row_idx, row in enumerate(rows):
            for col_idx, label in enumerate(row):
                rect = pygame.Rect(
                    start_x + col_idx * (key_w + gap),
                    start_y + row_idx * (key_h + gap),
                    key_w,
                    key_h,
                )
                self.keyboard_buttons.append((label, rect))

        enter_rect = pygame.Rect(start_x, start_y + 3 * (key_h + gap), 4 * key_w + 3 * gap, key_h)
        self.keyboard_buttons.append(("Enter", enter_rect))
    
    def reset_game(self):
        self.score = 0
        self.lives = 3
        self.problems_solved = 0
        self.speed = 1
        self.raindrops = []
        self.input_text = ""
        self.editing_text = ""
        self.recent_answer_text = ""
        self.recent_answer_until = 0
        self.next_spawn_time = pygame.time.get_ticks()
        self.spawn_new_raindrop()
        self.schedule_next_raindrop()

    def start_new_game(self):
        self.reset_game()
        self.state = self.STATE_PLAYING
        self.set_input_active(True)

    def set_input_active(self, active):
        self.input_active = active
        if active:
            pygame.key.start_text_input()
            pygame.key.set_text_input_rect(self.input_box)
        else:
            pygame.key.stop_text_input()

    def get_difficulty_level(self):
        return (self.problems_solved // 10) + 1

    def get_speed_for_level(self, difficulty_level):
        if difficulty_level <= 2:
            return 1
        if difficulty_level <= 4:
            return 2
        if difficulty_level <= 6:
            return 3
        return 3 + (difficulty_level - 6)

    def get_spawn_interval_for_level(self, difficulty_level):
        if difficulty_level <= 2:
            return 3200
        if difficulty_level <= 4:
            return 2600
        if difficulty_level <= 6:
            return 2100
        return max(900, 1800 - (difficulty_level - 7) * 120)

    def get_max_raindrops_for_level(self, difficulty_level):
        if difficulty_level <= 2:
            return 2
        if difficulty_level <= 4:
            return 3
        if difficulty_level <= 6:
            return 4
        return min(7, 5 + (difficulty_level - 7) // 2)

    def schedule_next_raindrop(self):
        interval = self.get_spawn_interval_for_level(self.get_difficulty_level())
        self.next_spawn_time = pygame.time.get_ticks() + interval

    def get_spawn_x(self):
        min_x = RAINDROP_SIZE // 2 + 30
        max_x = SCREEN_WIDTH - RAINDROP_SIZE // 2 - 30
        min_gap = RAINDROP_SIZE + 30
        nearby_drops = [
            drop for drop in self.raindrops
            if drop.y < RAINDROP_SIZE * 2
        ]

        for _ in range(24):
            x = random.randint(min_x, max_x)
            if all(abs(x - drop.x) >= min_gap for drop in nearby_drops):
                return x

        return random.randint(min_x, max_x)
    
    def spawn_new_raindrop(self):
        x = self.get_spawn_x()
        y = RAINDROPS_START_Y
        op = random.choice(list(Operation))
        
        # Calculate difficulty level based on problems solved (every 10 problems = 1 level)
        difficulty_level = self.get_difficulty_level()
        self.speed = self.get_speed_for_level(difficulty_level)
        
        # Adjust number ranges based on difficulty
        min_num = 1 + (difficulty_level - 1) * 5
        max_num = 20 + (difficulty_level - 1) * 10
        
        if op == Operation.ADD:
            if difficulty_level == 1:
                num1 = random.randint(1, 10)
                num2 = random.randint(1, 10)
            elif difficulty_level == 2:
                num1 = random.randint(1, 20)
                num2 = random.randint(1, 20)
            elif difficulty_level == 3:
                num1 = random.randint(10, 30)
                num2 = random.randint(10, 30)
            elif difficulty_level == 4:
                num1 = random.randint(10, 50)
                num2 = random.randint(10, 50)
            elif difficulty_level == 5:
                num1 = random.randint(10, 99)
                num2 = random.randint(10, 99)
            elif difficulty_level == 6:
                num1 = random.randint(50, 99)
                num2 = random.randint(50, 99)
            else:
                num1 = random.randint(50, 999)
                num2 = random.randint(50, 999)

        elif op == Operation.SUBTRACT:
            if difficulty_level == 1:
                min_subtract, max_subtract = 1, 10
            elif difficulty_level == 2:
                min_subtract, max_subtract = 1, 20
            elif difficulty_level == 3:
                min_subtract, max_subtract = 10, 30
            elif difficulty_level == 4:
                min_subtract, max_subtract = 10, 50
            elif difficulty_level == 5:
                min_subtract, max_subtract = 10, 99
            elif difficulty_level == 6:
                min_subtract, max_subtract = 50, 99
            else:
                min_subtract, max_subtract = 50, 999

            num1 = random.randint(min_subtract, max_subtract)
            if difficulty_level < 3:
                num2 = random.randint(min_subtract, num1)
            else:
                num2 = random.randint(min_subtract, max_subtract)

        # Multiplication starts with one-digit numbers, then scales up every 10 correct answers.
        elif op == Operation.MULTIPLY:
            if difficulty_level == 1:
                num1 = random.randint(1, 5)
                num2 = random.randint(1, 5)
            elif difficulty_level == 2:
                num1 = random.randint(1, 9)
                num2 = random.randint(1, 9)
            elif difficulty_level == 3:
                num1 = random.randint(2, 9)
                num2 = random.randint(10, 20)
            else:
                factor_min = min(99, 10 + (difficulty_level - 4) * 5)
                factor_max = min(99, 25 + (difficulty_level - 4) * 8)
                num1 = random.randint(factor_min, factor_max)
                num2 = random.randint(factor_min, factor_max)

        # For division, ensure exact division (no remainder)
        elif op == Operation.DIVIDE:
            if difficulty_level == 1:
                divisor_min, divisor_max = 1, 5
                quotient_min, quotient_max = 1, 5
            elif difficulty_level == 2:
                divisor_min, divisor_max = 1, 10
                quotient_min, quotient_max = 1, 10
            elif difficulty_level == 3:
                divisor_min, divisor_max = 2, 10
                quotient_min, quotient_max = 2, 20
            elif difficulty_level == 4:
                divisor_min, divisor_max = 2, 20
                quotient_min, quotient_max = 2, 30
            elif difficulty_level == 5:
                divisor_min, divisor_max = 5, 30
                quotient_min, quotient_max = 5, 50
            elif difficulty_level == 6:
                divisor_min, divisor_max = 10, 50
                quotient_min, quotient_max = 10, 99
            else:
                divisor_min, divisor_max = 10, 99
                quotient_min, quotient_max = 10, 999

            num2 = random.randint(divisor_min, divisor_max)
            num1 = num2 * random.randint(quotient_min, quotient_max)
        else:
            num1 = random.randint(min_num, max_num)
            num2 = random.randint(min_num, max_num)
        
        self.raindrops.append(Raindrop(x, y, op, num1, num2, self.speed))

    def append_input_char(self, char):
        if not char or len(self.input_text) >= 5:
            return

        self.editing_text = ""
        normalized = self.normalize_input_char(char)
        if not normalized:
            return

        if normalized.isdigit():
            self.recent_answer_text = ""
            self.recent_answer_until = 0
            self.input_text += normalized
            self.input_flash_until = pygame.time.get_ticks() + 140
            self.refresh_input_display()
        elif normalized == '-' and self.input_text == "":
            self.recent_answer_text = ""
            self.recent_answer_until = 0
            self.input_text = '-'
            self.input_flash_until = pygame.time.get_ticks() + 140
            self.refresh_input_display()

    def append_input_text(self, text):
        for char in text:
            self.append_input_char(char)

    def append_input_from_keydown(self, char):
        normalized = self.normalize_input_char(char)
        if not normalized:
            return

        previous_input = self.input_text
        self.append_input_char(normalized)
        if self.input_text != previous_input:
            self.skip_textinput_char = normalized
            self.skip_textinput_time = pygame.time.get_ticks()

    def handle_text_input(self, text):
        self.editing_text = ""
        for char in text:
            normalized = self.normalize_input_char(char)
            if not normalized:
                continue

            skip_is_current = (
                normalized == self.skip_textinput_char
                and pygame.time.get_ticks() - self.skip_textinput_time < 150
            )
            if skip_is_current:
                self.skip_textinput_char = None
                continue

            self.skip_textinput_char = None
            self.append_input_char(normalized)

    def handle_text_editing(self, text):
        editing_chars = []
        for char in text:
            normalized = self.normalize_input_char(char)
            if normalized:
                editing_chars.append(normalized)

        self.editing_text = "".join(editing_chars)
        if self.editing_text and self.input_text.endswith(self.editing_text):
            self.editing_text = ""

        self.input_flash_until = pygame.time.get_ticks() + 140
        self.refresh_input_display()

    def normalize_input_char(self, char):
        if not char:
            return None

        if char.isdigit():
            return char

        if char in self.SYMBOL_TO_DIGIT:
            return self.SYMBOL_TO_DIGIT[char]

        if char == '-':
            return '-'

        return None

    def process_input_action(self, action):
        if action == "Enter":
            self.check_answer()
        elif action == "Back":
            if self.editing_text:
                self.editing_text = self.editing_text[:-1]
            else:
                self.input_text = self.input_text[:-1]
            self.recent_answer_text = ""
            self.recent_answer_until = 0
            self.input_flash_until = pygame.time.get_ticks() + 140
            self.refresh_input_display()
        else:
            self.append_input_char(action)

    def handle_keyboard_click(self, mouse_pos):
        for label, rect in self.keyboard_buttons:
            if rect.collidepoint(mouse_pos):
                self.set_input_active(True)
                self.process_input_action(label)
                break

    def handle_physical_keyboard_input(self, event):
        self.set_input_active(True)

        if event.key == pygame.K_RETURN or event.key == pygame.K_KP_ENTER:
            self.process_input_action("Enter")
        elif event.key == pygame.K_BACKSPACE:
            self.process_input_action("Back")
        elif event.key == pygame.K_MINUS or event.key == pygame.K_KP_MINUS:
            self.append_input_from_keydown("-")
        elif event.key in self.KEY_TO_DIGIT:
            self.append_input_from_keydown(self.KEY_TO_DIGIT[event.key])
        elif getattr(event, "scancode", None) in self.SCANCODE_TO_CHAR:
            self.append_input_from_keydown(self.SCANCODE_TO_CHAR[event.scancode])
        elif event.unicode:
            self.append_input_from_keydown(event.unicode)
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False

            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                if self.state == self.STATE_MENU:
                    if self.play_button.collidepoint(event.pos):
                        self.start_new_game()
                elif self.state == self.STATE_PLAYING:
                    if self.input_box.collidepoint(event.pos):
                        self.set_input_active(True)
                    else:
                        self.handle_keyboard_click(event.pos)
                elif self.state == self.STATE_GAME_OVER:
                    if self.replay_button.collidepoint(event.pos):
                        self.start_new_game()
                    elif self.quit_button.collidepoint(event.pos):
                        return False

            elif event.type == pygame.TEXTINPUT:
                if self.state == self.STATE_PLAYING:
                    self.set_input_active(True)
                    self.handle_text_input(event.text)

            elif event.type == pygame.TEXTEDITING:
                if self.state == self.STATE_PLAYING:
                    self.set_input_active(True)
                    self.handle_text_editing(event.text)

            elif event.type == pygame.KEYDOWN:
                alt_enter = event.key == pygame.K_RETURN and getattr(event, "mod", 0) & pygame.KMOD_ALT
                if event.key == pygame.K_F11 or alt_enter:
                    self.toggle_fullscreen()
                    continue
                if event.key == pygame.K_ESCAPE and self.fullscreen:
                    self.toggle_fullscreen()
                    continue

                if self.state == self.STATE_MENU:
                    if event.key == pygame.K_RETURN or event.key == pygame.K_SPACE:
                        self.start_new_game()
                elif self.state == self.STATE_PLAYING:
                    self.handle_physical_keyboard_input(event)
                elif self.state == self.STATE_GAME_OVER:
                    if event.key == pygame.K_r:
                        self.start_new_game()
                    elif event.key == pygame.K_q:
                        return False
        return True
    
    def check_answer(self):
        if self.editing_text:
            self.input_text = self.get_visible_input_text()[:5]
            self.editing_text = ""

        if not self.input_text or not self.raindrops:
            return
        
        try:
            user_answer = int(self.input_text)
            matching_drops = [
                drop for drop in self.raindrops
                if drop.get_answer() == user_answer
            ]
            
            if matching_drops:
                solved_drop = max(matching_drops, key=lambda drop: drop.y)
                self.raindrops.remove(solved_drop)
                self.score += 1
                self.problems_solved += 1
                self.recent_answer_color = (0, 100, 0)
            else:
                self.lives -= 1
                self.recent_answer_color = RED
            
            self.recent_answer_text = self.input_text
            self.recent_answer_until = pygame.time.get_ticks() + 650
            self.input_text = ""
            self.refresh_input_display()
            
            if self.lives <= 0:
                self.state = self.STATE_GAME_OVER
                self.set_input_active(False)
                return
            
            if not self.raindrops:
                self.spawn_new_raindrop()
                self.schedule_next_raindrop()
        except ValueError:
            pass
    
    def update(self):
        difficulty_level = self.get_difficulty_level()
        self.speed = self.get_speed_for_level(difficulty_level)

        for raindrop in self.raindrops[:]:
            raindrop.speed = self.speed
            raindrop.update()

            if not raindrop.is_off_screen():
                continue

            self.raindrops.remove(raindrop)
            self.lives -= 1
            self.input_text = ""

            if self.lives <= 0:
                self.state = self.STATE_GAME_OVER
                self.set_input_active(False)
                return

        now = pygame.time.get_ticks()
        max_raindrops = self.get_max_raindrops_for_level(difficulty_level)
        if len(self.raindrops) < max_raindrops and now >= self.next_spawn_time:
            self.spawn_new_raindrop()
            self.schedule_next_raindrop()
        elif len(self.raindrops) >= max_raindrops and now >= self.next_spawn_time:
            self.next_spawn_time = now + 300

        if not self.raindrops and self.lives > 0:
            self.spawn_new_raindrop()
            self.schedule_next_raindrop()

    def draw_button(self, rect, label, bg_color, text_color=WHITE, border_color=None):
        hovered = rect.collidepoint(pygame.mouse.get_pos())
        fill = self.blend_color(bg_color, WHITE, 0.12) if hovered else bg_color
        border = border_color or self.blend_color(fill, WHITE, 0.35)

        shadow_rect = rect.move(0, 4)
        pygame.draw.rect(self.screen, (13, 28, 48), shadow_rect, border_radius=8)
        pygame.draw.rect(self.screen, fill, rect, border_radius=8)
        pygame.draw.rect(self.screen, border, rect, width=2, border_radius=8)

        text = self.font_button.render(label, True, text_color)
        self.screen.blit(text, text.get_rect(center=rect.center))

    def draw_menu(self):
        self.draw_background()
        self.draw_text_with_shadow("Math Rain", self.font_large, WHITE, (SCREEN_WIDTH // 2, 150))

        subtitle = self.font_small.render("Solve each drop before it reaches the bottom.", True, (221, 238, 247))
        self.screen.blit(subtitle, subtitle.get_rect(center=(SCREEN_WIDTH // 2, 212)))

        for index, text in enumerate(("8 + 5", "6 x 4", "21 / 3")):
            center_x = SCREEN_WIDTH // 2 - 145 + index * 145
            center_y = 280 + (index % 2) * 16
            pygame.draw.circle(self.screen, (42, 92, 123), (center_x + 4, center_y + 7), 42)
            pygame.draw.circle(self.screen, CYAN, (center_x, center_y), 40)
            pygame.draw.circle(self.screen, (170, 240, 248), (center_x - 12, center_y - 13), 9)
            pygame.draw.circle(self.screen, ACCENT_DARK, (center_x, center_y), 40, width=2)
            problem = self.font_small.render(text, True, BLACK)
            self.screen.blit(problem, problem.get_rect(center=(center_x, center_y)))

        self.draw_button(self.play_button, "Play", GREEN, BLACK, border_color=(176, 241, 202))

    def draw_hud(self):
        hud_rect = pygame.Rect(20, 16, SCREEN_WIDTH - 40, 58)
        self.draw_panel(hud_rect, fill=(238, 247, 252), border=(148, 190, 212), radius=8, shadow=True)

        label_color = TEXT_MUTED
        value_color = BLACK
        difficulty_level = self.get_difficulty_level()

        lives_label = self.font_tiny.render("LIVES", True, label_color)
        self.screen.blit(lives_label, (42, 24))
        for index in range(3):
            color = RED if index < self.lives else (201, 215, 225)
            pygame.draw.circle(self.screen, color, (52 + index * 24, 55), 8)
            pygame.draw.circle(self.screen, WHITE, (49 + index * 24, 52), 3)

        level_label = self.font_tiny.render("LEVEL", True, label_color)
        level_value = self.font_medium.render(str(difficulty_level), True, value_color)
        self.screen.blit(level_label, level_label.get_rect(midtop=(SCREEN_WIDTH // 2, 24)))
        self.screen.blit(level_value, level_value.get_rect(midtop=(SCREEN_WIDTH // 2, 37)))

        score_label = self.font_tiny.render("SCORE", True, label_color)
        score_value = self.font_medium.render(str(self.score), True, value_color)
        self.screen.blit(score_label, score_label.get_rect(topright=(SCREEN_WIDTH - 42, 24)))
        self.screen.blit(score_value, score_value.get_rect(topright=(SCREEN_WIDTH - 42, 37)))

    def draw_raindrop(self, raindrop):
        x = int(raindrop.x)
        y = int(raindrop.y)
        radius = raindrop.size // 2

        pygame.draw.circle(self.screen, (20, 55, 86), (x + 5, y + 8), radius)
        pygame.draw.circle(self.screen, (126, 232, 242), (x, y), radius)
        pygame.draw.circle(self.screen, CYAN, (x, y + 3), radius - 7)
        pygame.draw.circle(self.screen, (227, 253, 255), (x - 14, y - 15), 10)
        pygame.draw.circle(self.screen, ACCENT_DARK, (x, y), radius, width=2)

        problem_text_raw = raindrop.get_problem_text()
        problem_font = self.font_problem
        problem_text = problem_font.render(problem_text_raw, True, BLACK)
        if problem_text.get_width() > raindrop.size - 8:
            problem_font = self.font_problem_small
            problem_text = problem_font.render(problem_text_raw, True, BLACK)
        if problem_text.get_width() > raindrop.size - 8:
            problem_text = self.font_problem_tiny.render(problem_text_raw, True, BLACK)
        text_rect = problem_text.get_rect(center=(x, y + 2))
        self.screen.blit(problem_text, text_rect)

    def draw_raindrops(self):
        for raindrop in sorted(self.raindrops, key=lambda drop: drop.y):
            self.draw_raindrop(raindrop)

    def draw_input_area(self):
        active = self.input_active
        border_color = ACCENT if active else PANEL_BORDER
        self.draw_panel(self.input_box, fill=PANEL, border=border_color, radius=8, shadow=True)

        input_label = self.font_button.render("Answer", True, BLACK)
        self.screen.blit(input_label, (self.input_box.x + 18, self.input_box.y + 15))

        answer_area = pygame.Rect(
            self.input_box.x + 128,
            self.input_box.y + 5,
            self.input_box.width - 138,
            self.input_box.height - 10,
        )
        answer_bg = (225, 247, 247) if pygame.time.get_ticks() < self.input_flash_until else (241, 248, 251)
        pygame.draw.rect(self.screen, answer_bg, answer_area, border_radius=6)
        pygame.draw.rect(self.screen, border_color, answer_area, width=2, border_radius=6)

        display_text = self.get_visible_input_text()
        display_color = BLACK
        if not display_text and pygame.time.get_ticks() < self.recent_answer_until:
            display_text = self.recent_answer_text
            display_color = self.recent_answer_color

        input_display = self.font_input.render(display_text, True, display_color)
        input_rect = input_display.get_rect(midleft=(answer_area.x + 18, answer_area.centery))
        self.screen.blit(input_display, input_rect)

        cursor_visible = self.input_active and (pygame.time.get_ticks() // 450) % 2 == 0
        if cursor_visible:
            cursor_x = input_rect.right + 4
            cursor_y = answer_area.y + 8
            pygame.draw.line(
                self.screen,
                BLACK,
                (cursor_x, cursor_y),
                (cursor_x, cursor_y + answer_area.height - 16),
                3,
            )

    def get_visible_input_text(self):
        if not self.editing_text:
            return self.input_text

        if not self.input_text:
            return self.editing_text

        max_overlap = min(len(self.input_text), len(self.editing_text))
        for overlap in range(max_overlap, 0, -1):
            if self.input_text.endswith(self.editing_text[:overlap]):
                return self.input_text + self.editing_text[overlap:]

        return self.input_text + self.editing_text

    def refresh_input_display(self):
        if self.state != self.STATE_PLAYING:
            return

        self.draw_playing_scene()
        pygame.display.flip()

    def draw_on_screen_keyboard(self):
        for label, rect in self.keyboard_buttons:
            if label == "Enter":
                bg_color = GREEN
                text_color = BLACK
                border_color = (174, 239, 200)
            elif label == "Back":
                bg_color = RED
                text_color = WHITE
                border_color = (245, 174, 174)
            elif label == "-":
                bg_color = AMBER
                text_color = BLACK
                border_color = (255, 227, 153)
            else:
                bg_color = KEY_BG_HOVER if rect.collidepoint(pygame.mouse.get_pos()) else KEY_BG
                text_color = WHITE
                border_color = (107, 139, 166)

            self.draw_button(rect, label, bg_color, text_color, border_color)

    def draw_playing_scene(self):
        self.draw_background()
        self.draw_hud()
        self.draw_raindrops()
        self.draw_on_screen_keyboard()
        self.draw_input_area()

    def draw_game_over_overlay(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
        overlay.set_alpha(190)
        overlay.fill(BLACK)
        self.screen.blit(overlay, (0, 0))

        panel_rect = pygame.Rect(SCREEN_WIDTH // 2 - 190, SCREEN_HEIGHT // 2 - 135, 380, 285)
        self.draw_panel(panel_rect, fill=PANEL, border=PANEL_BORDER, radius=8, shadow=True)

        game_over_text = self.font_medium.render("GAME OVER", True, RED)
        final_score_text = self.font_small.render(f"Final score: {self.score}", True, TEXT_MUTED)
        self.screen.blit(game_over_text, game_over_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 78)))
        self.screen.blit(final_score_text, final_score_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 35)))

        self.draw_button(self.replay_button, "Replay", GREEN, BLACK, border_color=(176, 241, 202))
        self.draw_button(self.quit_button, "Quit", RED, WHITE, border_color=(245, 174, 174))
    
    def draw(self):
        if self.state == self.STATE_MENU:
            self.draw_menu()
        elif self.state == self.STATE_PLAYING:
            self.draw_playing_scene()
        elif self.state == self.STATE_GAME_OVER:
            self.draw_playing_scene()
            self.draw_game_over_overlay()

        pygame.display.flip()
    
    def run(self):
        running = True
        while running:
            running = self.handle_events()

            if self.state == self.STATE_PLAYING:
                self.update()

            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()
