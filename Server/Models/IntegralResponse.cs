public class IntegralResponse
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }

    /// <summary>Expresión original normalizada (infix).</summary>
    public string OriginalExpression { get; set; } = string.Empty;

    /// <summary>Expresión original en LaTeX.</summary>
    public string OriginalLatex { get; set; } = string.Empty;

    /// <summary>Resultado final en formato infix.</summary>
    public string ResultExpression { get; set; } = string.Empty;

    /// <summary>Resultado final en LaTeX.</summary>
    public string ResultLatex { get; set; } = string.Empty;

    /// <summary>Lista ordenada de pasos de la resolución.</summary>
    public List<SolutionStep> Steps { get; set; } = [];
}
