public class SolutionStep
{
    public int Number { get; set; }

    /// <summary>Nombre corto del paso (e.g., "Regla de la potencia").</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Explicación detallada del paso en formato LaTeX / texto.</summary>
    public string Explanation { get; set; } = string.Empty;

    /// <summary>Expresión matemática resultante en LaTeX.</summary>
    public string Latex { get; set; } = string.Empty;

    /// <summary>Nombre de la regla aplicada.</summary>
    public string RuleName { get; set; } = string.Empty;
}
