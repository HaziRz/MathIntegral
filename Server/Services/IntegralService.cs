using MathNet.Symbolics;

public class IntegralService : IIntegralService
{
    private readonly ILogger<IntegralService> _logger;

    public IntegralService(ILogger<IntegralService> logger)
    {
        _logger = logger;
    }

    public IntegralResponse Solve(IntegralRequest request)
    {
        // ── 1. Parsear la expresión ───────────────────────────────────
        Expression expr;
        try
        {
            expr = Infix.ParseOrThrow(request.Expression);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Error al parsear '{Expr}': {Msg}", request.Expression, ex.Message);
            return Fail(
                $"No se pudo interpretar \"{request.Expression}\". " +
                "Verifica la sintaxis:\n" +
                "  • Multiplicación explícita: 3*x  (no \"3x\")\n" +
                "  • Potencia: x^2\n" +
                "  • Funciones: sin(x), cos(x), tan(x), exp(x), log(x)\n" +
                "  • División: 1/x",
                request.Expression);
        }

        // ── 2. Integrar paso a paso ───────────────────────────────────
        string variable = string.IsNullOrWhiteSpace(request.Variable)
            ? "x"
            : request.Variable.Trim();

        try
        {
            var engine = new IntegrationEngine(variable);
            var (result, steps) = engine.Integrate(expr);

            _logger.LogInformation(
                "Integral de '{Expr}' resuelta en {N} pasos.",
                request.Expression, steps.Count);

            return new IntegralResponse
            {
                Success            = true,
                OriginalExpression = Infix.Format(expr),
                OriginalLatex      = LaTeX.Format(expr),
                ResultExpression   = $"{Infix.Format(result)} + C",
                ResultLatex        = $"{LaTeX.Format(result)} + C",
                Steps              = steps,
            };
        }
        catch (NotSupportedException ex)
        {
            _logger.LogInformation("Expresión no soportada: {Msg}", ex.Message);
            return Fail(ex.Message, request.Expression);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inesperado integrando '{Expr}'", request.Expression);
            return Fail(
                "Ocurrió un error inesperado. Intenta simplificar la expresión.",
                request.Expression);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    private static IntegralResponse Fail(string msg, string original) => new()
    {
        Success            = false,
        ErrorMessage       = msg,
        OriginalExpression = original,
        Steps              = [],
    };
}
