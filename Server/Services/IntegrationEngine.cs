using MathNet.Symbolics;
using System.Text.RegularExpressions;

/// <summary>
/// Motor de integración simbólica paso a paso, basado en MathNet.Symbolics.
///
/// Reglas implementadas:
///   • Constante:          ∫k dx = kx + C
///   • Potencia:           ∫x^n dx = x^(n+1)/(n+1) + C
///   • Suma / Resta:       ∫(f ± g) dx = ∫f dx ± ∫g dx
///   • Múltiplo constante: ∫k·f(x) dx = k·∫f(x) dx
///   • Negación:           ∫−f(x) dx = −∫f(x) dx
///   • Seno:               ∫sin(x) dx = −cos(x) + C
///   • Coseno:             ∫cos(x) dx = sin(x) + C
///   • Tangente:           ∫tan(x) dx = −ln|cos(x)| + C
///   • Exponencial:        ∫e^x dx = e^x + C
///   • Logarítmica (1/x):  ∫1/x dx = ln|x| + C
///   • Logaritmo natural:  ∫ln(x) dx = x·ln(x) − x + C
///
/// NOTA DE SINTAXIS PARA EL USUARIO:
///   Multiplicación explícita: 3*x  (no "3x")
///   Potencia: x^2
///   Funciones: sin(x), cos(x), tan(x), exp(x), log(x)  ← log = ln en MathNet
///   División:  1/x
/// </summary>
public class IntegrationEngine
{
    private readonly Expression _var;   // Símbolo de la variable (e.g., x)
    private readonly string _varName;   // Nombre como string (e.g., "x")
    private List<SolutionStep> _steps = [];
    private int _stepNum = 0;

    public IntegrationEngine(string variable = "x")
    {
        _varName = variable;
        _var     = Expression.Symbol(variable);
    }

    // ════════════════════════════════════════════════════════════════════
    //  PUNTO DE ENTRADA PÚBLICO
    // ════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Integra la expresión y devuelve el resultado junto con la lista de pasos.
    /// </summary>
    public (Expression Result, List<SolutionStep> Steps) Integrate(Expression expr)
    {
        _steps   = [];
        _stepNum = 0;

        // Paso 0 — Planteamiento
        AddStep(
            "Planteamiento",
            $"Resolver la integral indefinida: $\\int {Ltx(expr)} \\, d{_varName}$",
            $"\\int {Ltx(expr)} \\, d{_varName}",
            "Planteamiento de la integral");

        // Intentar expandir la expresión antes de integrar
        Expression expanded = Algebraic.Expand(expr);
        if (Fmt(expanded) != Fmt(expr))
        {
            AddStep(
                "Expansión algebraica",
                $"Se expande la expresión aplicando la propiedad distributiva: " +
                $"${Ltx(expanded)}$",
                Ltx(expanded),
                "Propiedad distributiva");
            expr = expanded;
        }

        Expression result = IntegrateCore(expr);

        // Paso final — Constante de integración
        AddStep(
            "Constante de integración",
            "Toda integral indefinida incluye una constante arbitraria $C$, " +
            "ya que la derivada de cualquier constante es cero.",
            $"{Ltx(result)} + C",
            "Constante de integración");

        return (result, _steps);
    }

    // ════════════════════════════════════════════════════════════════════
    //  NÚCLEO RECURSIVO
    // ════════════════════════════════════════════════════════════════════

    private Expression IntegrateCore(Expression expr)
    {
        // ── 1. Constante (no depende de la variable) ─────────────────
        if (IsConstant(expr))
            return ApplyConstantRule(expr);

        // ── 2. Variable sola  x  ─────────────────────────────────────
        if (IsJustVariable(expr))
            return ApplyPowerRuleTerm(Expression.One, 1);

        // ── 3. Polinomio en la variable ───────────────────────────────
        if (Polynomial.IsPolynomial(_var, expr))
            return IntegratePolynomial(expr);

        // ── 4. Funciones estándar (sin, cos, tan, exp, log, 1/x) ─────
        if (TryStandardFunction(expr, out Expression? funcResult))
            return funcResult!;

        // ── 5. Múltiplo constante  k·f(x) ────────────────────────────
        if (TryConstantMultiple(expr, out Expression? multResult))
            return multResult!;

        // ── 6. Negación  −f(x) ────────────────────────────────────────
        if (TryNegation(expr, out Expression? negResult))
            return negResult!;

        // ── Sin regla aplicable ───────────────────────────────────────
        throw new NotSupportedException(
            $"La expresión \"{Fmt(expr)}\" no puede resolverse con las reglas " +
            "implementadas (polinomios, sin/cos/tan, exp, log, 1/x, y múltiplos " +
            "constantes de esas funciones). Intenta expandir o simplificar primero.");
    }

    // ════════════════════════════════════════════════════════════════════
    //  REGLA DE LA CONSTANTE   ∫k dx = k·x
    // ════════════════════════════════════════════════════════════════════

    private Expression ApplyConstantRule(Expression k)
    {
        Expression result = k * _var;

        AddStep(
            "Regla de la constante",
            $"$\\int k \\, d{_varName} = k \\cdot {_varName} + C$" +
            $"\\quad (k = {Ltx(k)})$",
            Ltx(result),
            "Regla de la constante");

        return result;
    }

    // ════════════════════════════════════════════════════════════════════
    //  REGLA DE LA POTENCIA + SUMA (polinomios)
    //  ∫a·x^n dx = a·x^(n+1)/(n+1)
    // ════════════════════════════════════════════════════════════════════

    private Expression IntegratePolynomial(Expression expr)
    {
        // Polynomial.Coefficients devuelve Expression[] donde índice = grado
        Expression[] coeffs = Polynomial.Coefficients(_var, expr);

        // Grado 0: constante pura (ya cubierto arriba, pero por si acaso)
        if (coeffs.Length == 1)
            return ApplyConstantRule(coeffs[0]);

        // Varios términos → aplicar Regla de la Suma
        AddStep(
            "Regla de la suma",
            $"El integrando es un polinomio. Se integra cada término por separado: " +
            $"$\\int \\left[\\sum_{{n}} a_n {_varName}^n\\right] d{_varName} = " +
            $"\\sum_{{n}} \\int a_n {_varName}^n \\, d{_varName}$",
            Ltx(expr),
            "Regla de la suma");

        Expression total = Expression.Zero;

        for (int n = 0; n < coeffs.Length; n++)
        {
            Expression a = coeffs[n];
            if (Fmt(a) == "0") continue;     // omitir términos nulos

            total += n == 0
                ? ApplyConstantRule(a)        // término constante a₀
                : ApplyPowerRuleTerm(a, n);   // término aₙ·xⁿ
        }

        return Algebraic.Expand(total);
    }

    /// <summary>Integra el monomio  a·x^n  → a·x^(n+1)/(n+1)</summary>
    private Expression ApplyPowerRuleTerm(Expression a, int n)
    {
        int newN = n + 1;
        Expression newNExpr = Expression.Int32(newN);

        // MathNet simplifica automáticamente la aritmética racional:
        // e.g., 3·x³/3 → x³, 2·x²/2 → x²
        Expression result = Algebraic.Expand(a * Expression.Pow(_var, newNExpr) / newNExpr);

        string aLatex    = Fmt(a) == "1" ? "" : $"{Ltx(a)} \\cdot ";
        string termLatex = n == 1
            ? $"{aLatex}{_varName}"
            : $"{aLatex}{_varName}^{{{n}}}";

        AddStep(
            $"Regla de la potencia — término ${termLatex}$",
            $"$\\int a \\cdot {_varName}^n \\, d{_varName} = " +
            $"\\dfrac{{a \\cdot {_varName}^{{n+1}}}}{{n+1}} + C$, " +
            $"\\; a={Ltx(a)},\\; n={n}:" +
            $"\\quad \\Rightarrow \\quad {Ltx(result)}$",
            Ltx(result),
            "Regla de la potencia");

        return result;
    }

    // ════════════════════════════════════════════════════════════════════
    //  FUNCIONES ESTÁNDAR
    // ════════════════════════════════════════════════════════════════════

    private bool TryStandardFunction(Expression expr, out Expression? result)
    {
        result = null;
        string fmt = Fmt(expr).Trim();
        string v   = _varName;

        // ∫sin(x) dx = −cos(x)
        if (fmt == $"sin({v})")
        {
            result = Expression.Int32(-1) * Parse($"cos({v})");
            AddStep("Integral del seno",
                $"$\\int \\sin({v}) \\, d{v} = -\\cos({v}) + C$",
                $"-\\cos({v})",
                "Fórmula básica — seno");
            return true;
        }

        // ∫cos(x) dx = sin(x)
        if (fmt == $"cos({v})")
        {
            result = Parse($"sin({v})");
            AddStep("Integral del coseno",
                $"$\\int \\cos({v}) \\, d{v} = \\sin({v}) + C$",
                $"\\sin({v})",
                "Fórmula básica — coseno");
            return true;
        }

        // ∫tan(x) dx = −ln|cos(x)|
        if (fmt == $"tan({v})")
        {
            result = Expression.Int32(-1) * Parse($"log(cos({v}))");
            AddStep("Integral de la tangente",
                $"$\\int \\tan({v}) \\, d{v} = -\\ln|\\cos({v})| + C$",
                $"-\\ln|\\cos({v})|",
                "Fórmula básica — tangente");
            return true;
        }

        // ∫e^x dx = e^x   (MathNet representa e^x como exp(x))
        if (fmt == $"exp({v})" || fmt == $"e^{v}")
        {
            result = Parse($"exp({v})");
            AddStep("Integral de la función exponencial",
                $"$\\int e^{{{v}}} \\, d{v} = e^{{{v}}} + C$",
                $"e^{{{v}}}",
                "Fórmula básica — exponencial natural");
            return true;
        }

        // ∫1/x dx = ln|x|
        // MathNet parsea "1/x" como x^(-1), que formatea como "x^(-1)"
        if (fmt == $"1/{v}" || fmt == $"{v}^(-1)" || fmt == $"({v})^(-1)")
        {
            result = Parse($"log({v})");
            AddStep("Regla logarítmica (caso 1/x)",
                $"$\\int \\dfrac{{1}}{{{v}}} \\, d{v} = \\ln|{v}| + C$",
                $"\\ln|{v}|",
                "Regla logarítmica");
            return true;
        }

        // ∫ln(x) dx = x·ln(x) − x
        // IMPORTANTE: MathNet.Symbolics usa "log(x)" para el logaritmo natural.
        if (fmt == $"log({v})" || fmt == $"ln({v})")
        {
            Expression lnExpr = Parse($"log({v})");
            result = _var * lnExpr - _var;
            AddStep("Integral del logaritmo natural",
                $"$\\int \\ln({v}) \\, d{v} = {v}\\ln({v}) - {v} + C$" +
                $"\\quad \\text{{(integración por partes)}}$",
                $"{v}\\ln({v}) - {v}",
                "Integración por partes — logaritmo natural");
            return true;
        }

        return false;
    }

    // ════════════════════════════════════════════════════════════════════
    //  MÚLTIPLO CONSTANTE   k·f(x)
    //  Detecta el patrón "número*expresión" en la representación infix.
    // ════════════════════════════════════════════════════════════════════

    private bool TryConstantMultiple(Expression expr, out Expression? result)
    {
        result = null;
        string fmt = Fmt(expr);

        // Patrón:  [-]número[/número]*resto
        // Ejemplos que captura: "3*sin(x)", "2/3*cos(x)", "10*x^5"
        Match m = Regex.Match(fmt,
            @"^(-?(?:\d+(?:\.\d+)?(?:/\d+)?))\*(.+)$",
            RegexOptions.None, TimeSpan.FromSeconds(1));

        if (!m.Success) return false;

        Expression k, f;
        try
        {
            k = Parse(m.Groups[1].Value);
            f = Parse(m.Groups[2].Value);
        }
        catch { return false; }

        // Validar que k sea constante y f contenga la variable
        if (!IsConstant(k) || IsConstant(f)) return false;

        AddStep(
            "Regla del múltiplo constante",
            $"$\\int k \\cdot f({v()}) \\, d{v()} = k \\cdot \\int f({v()}) \\, d{v()}$. " +
            $"Se extrae la constante $k = {Ltx(k)}$ fuera de la integral.",
            $"{Ltx(k)} \\cdot \\int {Ltx(f)} \\, d{v()}",
            "Regla del múltiplo constante");

        Expression inner = IntegrateCore(f);
        result = Algebraic.Expand(k * inner);

        AddStep(
            "Resultado del múltiplo constante",
            $"Se multiplica el resultado parcial por $k = {Ltx(k)}$: " +
            $"${Ltx(k)} \\cdot {Ltx(inner)} = {Ltx(result)}$",
            Ltx(result),
            "Regla del múltiplo constante");

        return true;
    }

    // ════════════════════════════════════════════════════════════════════
    //  NEGACIÓN   −f(x)
    //  Trata −f(x) como (−1)·f(x) si no fue absorbida por las reglas anteriores.
    // ════════════════════════════════════════════════════════════════════

    private bool TryNegation(Expression expr, out Expression? result)
    {
        result = null;
        string fmt = Fmt(expr);

        // MathNet puede formatear −f(x) como "(-1)*f(x)" o como "-f(x)"
        string? innerStr = null;

        if (fmt.StartsWith("(-1)*"))
            innerStr = fmt["(-1)*".Length..];
        else if (fmt.StartsWith("-") && !char.IsDigit(fmt[1]))
            innerStr = fmt[1..];

        if (innerStr is null) return false;

        Expression inner;
        try { inner = Parse(innerStr); }
        catch { return false; }

        if (!Fmt(inner).Contains(_varName)) return false;

        AddStep(
            "Factor negativo (k = −1)",
            $"$-f({v()})$ se trata como $(-1) \\cdot f({v()})$, " +
            $"aplicando la regla del múltiplo constante con $k = -1$.",
            $"-\\int {Ltx(inner)} \\, d{v()}",
            "Regla del múltiplo constante (k = −1)");

        Expression innerResult = IntegrateCore(inner);
        result = Expression.Int32(-1) * innerResult;

        return true;
    }

    // ════════════════════════════════════════════════════════════════════
    //  HELPERS PRIVADOS
    // ════════════════════════════════════════════════════════════════════

    private bool IsConstant(Expression expr) =>
        !Fmt(expr).Contains(_varName);

    private bool IsJustVariable(Expression expr) =>
        Fmt(expr).Trim() == _varName;

    // Alias cortos para legibilidad interna
    private string  v()                    => _varName;
    private static  string  Fmt(Expression e) => Infix.Format(e);
    private static  string  Ltx(Expression e) => LaTeX.Format(e);
    private static  Expression Parse(string s) => Infix.ParseOrThrow(s);

    private void AddStep(string title, string desc, string latex, string rule)
    {
        _steps.Add(new SolutionStep
        {
            Number          = ++_stepNum,
            Title           = title,
            Description     = desc,
            ExpressionLatex = latex,
            RuleName        = rule,
        });
    }
}
