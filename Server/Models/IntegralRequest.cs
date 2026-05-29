using System.ComponentModel.DataAnnotations;

public class IntegralRequest
{
    [Required(ErrorMessage = "La expresión es requerida.")]
    public string Expression { get; set; } = string.Empty;

    /// <summary>
    /// Variable de integración. Por defecto 'x'.
    /// </summary>
    public string Variable { get; set; } = "x";
}
