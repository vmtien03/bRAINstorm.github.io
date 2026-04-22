import cmath


def solve_quadratic(a: float, b: float, c: float):
	if abs(a) < 1e-12:
		if abs(b) < 1e-12:
			return []
		return [-c / b]
	delta = b * b - 4 * a * c
	sqrt_delta = cmath.sqrt(delta)
	return [(-b + sqrt_delta) / (2 * a), (-b - sqrt_delta) / (2 * a)]


def solve_cubic(a: float, b: float, c: float, d: float):
	"""Giải phương trình bậc 3: a*x^3 + b*x^2 + c*x + d = 0"""
	if abs(a) < 1e-12:
		return solve_quadratic(b, c, d)

	# Chuẩn hóa: x^3 + A*x^2 + B*x + C = 0
	A = b / a
	B = c / a
	C = d / a

	# Đưa về dạng khuyết: y^3 + p*y + q = 0 với x = y - A/3
	p = B - (A * A) / 3
	q = (2 * A**3) / 27 - (A * B) / 3 + C

	# Cardano
	delta = (q / 2) ** 2 + (p / 3) ** 3
	sqrt_delta = cmath.sqrt(delta)

	u = (-q / 2 + sqrt_delta) ** (1 / 3)
	v = (-q / 2 - sqrt_delta) ** (1 / 3)

	omega = complex(-0.5, cmath.sqrt(3) / 2)
	omega2 = complex(-0.5, -cmath.sqrt(3) / 2)

	y1 = u + v
	y2 = omega * u + omega2 * v
	y3 = omega2 * u + omega * v

	x1 = y1 - A / 3
	x2 = y2 - A / 3
	x3 = y3 - A / 3

	return [x1, x2, x3]


def _format_root(z: complex) -> str:
	if abs(z.imag) < 1e-10:
		return f"{z.real:.10g}"
	return f"{z.real:.10g} {'+' if z.imag >= 0 else '-'} {abs(z.imag):.10g}i"


def _parse_number(raw: str) -> float:
	raw = raw.strip().replace(",", ".")
	if not raw:
		raise ValueError("Giá trị trống")
	return float(raw)


def _poly_value(a: float, b: float, c: float, d: float, x: float) -> float:
	return ((a * x + b) * x + c) * x + d


def _extract_real_values(values, eps: float = 1e-9):
	real_values = []
	for value in values:
		z = complex(value)
		if abs(z.imag) < eps:
			real_values.append(float(z.real))
	return real_values


def _unique_sorted(values, tolerance: float = 1e-6):
	ordered = sorted(values)
	unique = []
	for value in ordered:
		if not unique or abs(value - unique[-1]) > tolerance:
			unique.append(value)
	return unique


def _suggest_x_range(a: float, b: float, c: float, d: float):
	points = []
	points.extend(_extract_real_values(solve_cubic(a, b, c, d)))
	points.extend(_extract_real_values(solve_quadratic(3 * a, 2 * b, c)))

	if not points:
		points = [0.0]

	left = min(points)
	right = max(points)
	width = right - left

	if width < 1.0:
		width = 4.0
	else:
		width = max(4.0, width * 1.8)

	center = (left + right) / 2
	return center - width / 2, center + width / 2


def show_plot_window(a: float, b: float, c: float, d: float, parent=None):
	import tkinter as tk
	from tkinter import ttk

	window = tk.Toplevel(parent) if parent is not None else tk.Tk()
	window.title("Đồ thị phương trình")
	window.geometry("900x560")
	window.minsize(680, 420)
	window.configure(bg="#f5f7fb")

	style = ttk.Style(window)
	style.configure("PlotFrame.TFrame", background="#f5f7fb")
	style.configure("PlotTitle.TLabel", background="#f5f7fb", foreground="#0f172a", font=("Segoe UI", 16, "bold"))
	style.configure("PlotSub.TLabel", background="#f5f7fb", foreground="#334155", font=("Consolas", 11))
	style.configure("PlotInfo.TLabel", background="#f5f7fb", foreground="#475569", font=("Segoe UI", 10))

	container = ttk.Frame(window, padding=16, style="PlotFrame.TFrame")
	container.pack(fill="both", expand=True)

	equation_text = f"y = ({a:.6g})x^3 + ({b:.6g})x^2 + ({c:.6g})x + ({d:.6g})"
	ttk.Label(container, text="Đồ thị hàm số", style="PlotTitle.TLabel").pack(anchor="w")
	ttk.Label(container, text=equation_text, style="PlotSub.TLabel").pack(anchor="w", pady=(2, 10))

	canvas = tk.Canvas(
		container,
		bg="#ffffff",
		highlightthickness=1,
		highlightbackground="#d5dbe5",
	)
	canvas.pack(fill="both", expand=True)

	info_var = tk.StringVar(value="")
	ttk.Label(container, textvariable=info_var, style="PlotInfo.TLabel").pack(anchor="w", pady=(8, 0))

	controls = ttk.Frame(container, style="PlotFrame.TFrame")
	controls.pack(fill="x", pady=(8, 0))
	ttk.Button(controls, text="Đóng", command=window.destroy).pack(side="right")

	redraw_job = None

	def draw_plot():
		width = max(canvas.winfo_width(), 10)
		height = max(canvas.winfo_height(), 10)
		canvas.delete("all")

		padding = 48
		plot_width = width - 2 * padding
		plot_height = height - 2 * padding
		if plot_width < 50 or plot_height < 50:
			return

		x_min, x_max = _suggest_x_range(a, b, c, d)
		sample_count = max(300, plot_width)
		x_step = (x_max - x_min) / sample_count
		xs = [x_min + i * x_step for i in range(sample_count + 1)]
		ys = [_poly_value(a, b, c, d, x) for x in xs]

		y_min = min(ys)
		y_max = max(ys)
		if abs(y_max - y_min) < 1e-9:
			y_pad = max(1.0, abs(y_max) * 0.2 + 1.0)
			y_min -= y_pad
			y_max += y_pad
		else:
			y_pad = (y_max - y_min) * 0.15
			y_min -= y_pad
			y_max += y_pad

		def map_x(value):
			return padding + (value - x_min) * plot_width / (x_max - x_min)

		def map_y(value):
			return height - padding - (value - y_min) * plot_height / (y_max - y_min)

		grid_steps = 8
		for i in range(grid_steps + 1):
			x_line = padding + i * plot_width / grid_steps
			y_line = padding + i * plot_height / grid_steps
			canvas.create_line(x_line, padding, x_line, height - padding, fill="#edf1f7")
			canvas.create_line(padding, y_line, width - padding, y_line, fill="#edf1f7")

		if x_min <= 0 <= x_max:
			y_axis_x = map_x(0)
			canvas.create_line(y_axis_x, padding, y_axis_x, height - padding, fill="#334155", width=1.5)
			canvas.create_text(y_axis_x + 14, padding + 12, text="y", fill="#334155", font=("Segoe UI", 10, "bold"))

		if y_min <= 0 <= y_max:
			x_axis_y = map_y(0)
			canvas.create_line(padding, x_axis_y, width - padding, x_axis_y, fill="#334155", width=1.5)
			canvas.create_text(width - padding - 12, x_axis_y - 12, text="x", fill="#334155", font=("Segoe UI", 10, "bold"))

		coords = []
		for x, y in zip(xs, ys):
			coords.extend((map_x(x), map_y(y)))
		canvas.create_line(*coords, fill="#0f766e", width=2.6, smooth=True)

		real_roots = _unique_sorted(_extract_real_values(solve_cubic(a, b, c, d)))
		for root in real_roots:
			if x_min <= root <= x_max:
				px = map_x(root)
				py = map_y(_poly_value(a, b, c, d, root))
				canvas.create_oval(px - 4, py - 4, px + 4, py + 4, fill="#dc2626", outline="")
				canvas.create_text(px, py - 14, text=f"{root:.4g}", fill="#b91c1c", font=("Segoe UI", 9))

		info_var.set(
			f"Miền vẽ x: [{x_min:.5g}, {x_max:.5g}] | y: [{y_min:.5g}, {y_max:.5g}]"
		)

	def schedule_redraw(_event=None):
		nonlocal redraw_job
		if redraw_job is not None:
			canvas.after_cancel(redraw_job)
		redraw_job = canvas.after(30, draw_plot)

	canvas.bind("<Configure>", schedule_redraw)
	draw_plot()

	if parent is None:
		window.mainloop()


def run_cli():
	print("Giải phương trình bậc 3: a*x^3 + b*x^2 + c*x + d = 0")
	try:
		a = _parse_number(input("Nhập a: "))
		b = _parse_number(input("Nhập b: "))
		c = _parse_number(input("Nhập c: "))
		d = _parse_number(input("Nhập d: "))
	except ValueError:
		print("Hệ số không hợp lệ. Vui lòng nhập số.")
		return

	roots = solve_cubic(a, b, c, d)

	if not roots:
		print("Phương trình vô nghiệm hoặc vô số nghiệm.")
	elif len(roots) == 1:
		print("Nghiệm:", _format_root(roots[0]))
	else:
		print("Các nghiệm:")
		for i, r in enumerate(roots, start=1):
			print(f"x{i} = {_format_root(r)}")

	choice = input("Mở cửa sổ đồ thị? (y/N): ").strip().lower()
	if choice in ("y", "yes", "co", "c", "1"):
		try:
			show_plot_window(a, b, c, d)
		except Exception as exc:
			print(f"Không thể mở đồ thị: {exc}")


def run_gui():
	import tkinter as tk
	from tkinter import messagebox, ttk

	root = tk.Tk()
	root.title("Giải phương trình bậc 3")
	root.geometry("760x520")
	root.minsize(640, 420)
	root.configure(bg="#f7f8fc")

	style = ttk.Style(root)
	style.theme_use("clam")
	style.configure("TFrame", background="#f7f8fc")
	style.configure("TLabel", background="#f7f8fc")
	style.configure("Title.TLabel", font=("Segoe UI", 18, "bold"), foreground="#12344d")
	style.configure("Hint.TLabel", font=("Segoe UI", 10), foreground="#4a5a6a")
	style.configure("Eq.TLabel", font=("Consolas", 11), foreground="#12344d")
	style.configure("Accent.TButton", font=("Segoe UI", 10, "bold"))

	container = ttk.Frame(root, padding=20)
	container.pack(fill="both", expand=True)

	ttk.Label(container, text="Bộ Giải Phương Trình Bậc 3", style="Title.TLabel").pack(anchor="w")
	ttk.Label(
		container,
		text="Nhập hệ số cho phương trình: a*x^3 + b*x^2 + c*x + d = 0",
		style="Hint.TLabel",
	).pack(anchor="w", pady=(4, 12))

	coeff_frame = ttk.Frame(container)
	coeff_frame.pack(fill="x")

	entries = {}
	defaults = {"a": "1", "b": "0", "c": "0", "d": "-1"}
	for i, name in enumerate(("a", "b", "c", "d")):
		ttk.Label(coeff_frame, text=f"{name} =", style="Eq.TLabel").grid(
			row=0,
			column=i * 2,
			sticky="w",
			padx=(0, 6),
			pady=(0, 6),
		)
		entry = ttk.Entry(coeff_frame, width=10, font=("Consolas", 11))
		entry.grid(row=0, column=i * 2 + 1, sticky="w", padx=(0, 16), pady=(0, 6))
		entry.insert(0, defaults[name])
		entries[name] = entry

	action_frame = ttk.Frame(container)
	action_frame.pack(fill="x", pady=(8, 12))

	ttk.Label(container, text="Kết quả", style="Eq.TLabel").pack(anchor="w", pady=(0, 6))

	result_box = tk.Text(
		container,
		height=12,
		font=("Consolas", 11),
		bg="#ffffff",
		fg="#17212b",
		relief="solid",
		borderwidth=1,
		padx=10,
		pady=8,
		wrap="word",
	)
	result_box.pack(fill="both", expand=True)

	def show_lines(lines):
		result_box.configure(state="normal")
		result_box.delete("1.0", tk.END)
		result_box.insert(tk.END, "\n".join(lines))
		result_box.configure(state="disabled")

	def parse_entries():
		values = []
		for name in ("a", "b", "c", "d"):
			raw = entries[name].get().strip().replace(",", ".")
			if not raw:
				raise ValueError(f"Chưa nhập hệ số {name}.")
			try:
				values.append(float(raw))
			except ValueError as exc:
				raise ValueError(f"Hệ số {name} không phải số hợp lệ.") from exc
		return values

	def on_solve():
		try:
			a, b, c, d = parse_entries()
		except ValueError as exc:
			messagebox.showerror("Dữ liệu không hợp lệ", str(exc), parent=root)
			return

		roots = solve_cubic(a, b, c, d)
		if not roots:
			show_lines(["Phương trình vô nghiệm hoặc vô số nghiệm."])
			return

		if len(roots) == 1:
			show_lines([f"Nghiệm: {_format_root(roots[0])}"])
			return

		lines = ["Các nghiệm:"]
		for i, r in enumerate(roots, start=1):
			lines.append(f"x{i} = {_format_root(r)}")
		show_lines(lines)

	def on_clear():
		for name in ("a", "b", "c", "d"):
			entries[name].delete(0, tk.END)
		show_lines(['Nhập các hệ số rồi bấm "Giải".'])
		entries["a"].focus_set()

	def on_plot():
		try:
			a, b, c, d = parse_entries()
		except ValueError as exc:
			messagebox.showerror("Dữ liệu không hợp lệ", str(exc), parent=root)
			return

		show_plot_window(a, b, c, d, parent=root)

	ttk.Button(action_frame, text="Giải", style="Accent.TButton", command=on_solve).pack(side="left")
	ttk.Button(action_frame, text="Vẽ đồ thị", command=on_plot).pack(side="left", padx=(8, 0))
	ttk.Button(action_frame, text="Làm mới", command=on_clear).pack(side="left", padx=(8, 0))
	ttk.Button(action_frame, text="Thoát", command=root.destroy).pack(side="right")

	show_lines(['Nhập các hệ số rồi bấm "Giải".'])
	entries["a"].focus_set()
	root.mainloop()


if __name__ == "__main__":
	print("Chọn chế độ chạy:")
	print("1. Giao diện đồ họa (UI)")
	print("2. Dòng lệnh (CLI)")
	choice = input("Nhập lựa chọn (mặc định 1): ").strip()

	if choice in ("", "1"):
		run_gui()
	else:
		run_cli()
